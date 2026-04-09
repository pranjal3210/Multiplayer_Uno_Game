let Redis;
const logger = require('./logger');

try {
  Redis = require('ioredis');
} catch (error) {
  Redis = null;
}

class InMemoryRedis {
  constructor(sharedState) {
    this.sharedState = sharedState;
    this.errorHandler = null;
    this.watchedKeys = new Map();
  }

  on(event, handler) {
    if (event === 'error') {
      this.errorHandler = handler;
    }
    return this;
  }

  _emitError(error) {
    if (this.errorHandler) {
      this.errorHandler(error);
    }
  }

  async get(key) {
    const entry = this.sharedState.store.get(key);
    return entry ? entry.value : null;
  }

  _clearTtl(key) {
    const timeout = this.sharedState.ttls.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.sharedState.ttls.delete(key);
    }
  }

  _deleteKey(key) {
    this.sharedState.store.delete(key);
    this.sharedState.lists.delete(key);
    this.sharedState.sortedSets.delete(key);
    this._clearTtl(key);
  }

  async set(key, value, mode, ttlSeconds) {
    const entry = {
      value,
      version: (this.sharedState.store.get(key)?.version || 0) + 1,
    };

    this.sharedState.store.set(key, entry);

    if (mode === 'EX' && typeof ttlSeconds === 'number') {
      this._clearTtl(key);

      const nextTimeout = setTimeout(() => {
        const current = this.sharedState.store.get(key);
        if (current && current.version === entry.version) {
          this._deleteKey(key);
        }
      }, ttlSeconds * 1000);

      if (typeof nextTimeout.unref === 'function') {
        nextTimeout.unref();
      }

      this.sharedState.ttls.set(key, nextTimeout);
    }

    return 'OK';
  }

  async rpush(key, value) {
    const list = this.sharedState.lists.get(key) || [];
    list.push(value);
    this.sharedState.lists.set(key, list);
    return list.length;
  }

  async lrange(key, start, stop) {
    const list = this.sharedState.lists.get(key) || [];
    const normalizedStart = start < 0 ? Math.max(list.length + start, 0) : start;
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    return list.slice(normalizedStart, normalizedStop + 1);
  }

  async lrem(key, count, value) {
    const list = this.sharedState.lists.get(key) || [];
    let removed = 0;
    const next = [];

    for (const item of list) {
      const shouldRemove = item === value && (count === 0 || removed < count);
      if (shouldRemove) {
        removed += 1;
        continue;
      }
      next.push(item);
    }

    this.sharedState.lists.set(key, next);
    return removed;
  }

  async lpop(key) {
    const list = this.sharedState.lists.get(key) || [];
    const value = list.shift() ?? null;
    this.sharedState.lists.set(key, list);
    return value;
  }

  async llen(key) {
    const list = this.sharedState.lists.get(key) || [];
    return list.length;
  }

  async zadd(key, score, member) {
    const set = this.sharedState.sortedSets.get(key) || new Map();
    set.set(member, Number(score));
    this.sharedState.sortedSets.set(key, set);
    return 1;
  }

  async zremrangebyscore(key, min, max) {
    const set = this.sharedState.sortedSets.get(key);
    if (!set) {
      return 0;
    }

    let removed = 0;
    for (const [member, score] of [...set.entries()]) {
      if (score >= min && score <= max) {
        set.delete(member);
        removed += 1;
      }
    }

    if (set.size === 0) {
      this.sharedState.sortedSets.delete(key);
    } else {
      this.sharedState.sortedSets.set(key, set);
    }

    return removed;
  }

  async zcard(key) {
    const set = this.sharedState.sortedSets.get(key);
    return set ? set.size : 0;
  }

  async zrevrange(key, start, stop, withScores) {
    const set = this.sharedState.sortedSets.get(key) || new Map();
    const items = [...set.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(start, stop + 1);

    if (withScores === 'WITHSCORES') {
      return items.flatMap(([member, score]) => [member, String(score)]);
    }

    return items.map(([member]) => member);
  }

  async expire(key, ttlSeconds) {
    this._clearTtl(key);

    const nextTimeout = setTimeout(() => {
      this._deleteKey(key);
    }, ttlSeconds * 1000);

    if (typeof nextTimeout.unref === 'function') {
      nextTimeout.unref();
    }

    this.sharedState.ttls.set(key, nextTimeout);
    return 1;
  }

  async watch(key) {
    const entry = this.sharedState.store.get(key);
    this.watchedKeys.set(key, entry ? entry.version : 0);
    return 'OK';
  }

  async unwatch() {
    this.watchedKeys.clear();
    return 'OK';
  }

  multi() {
    return new InMemoryTransaction(this.sharedState, this.watchedKeys);
  }

  pipeline() {
    return new InMemoryPipeline(this);
  }
}

class InMemoryPipeline {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.ops = [];
  }

  zremrangebyscore(...args) {
    this.ops.push(['zremrangebyscore', args]);
    return this;
  }

  zadd(...args) {
    this.ops.push(['zadd', args]);
    return this;
  }

  zcard(...args) {
    this.ops.push(['zcard', args]);
    return this;
  }

  expire(...args) {
    this.ops.push(['expire', args]);
    return this;
  }

  async exec() {
    const results = [];

    for (const [method, args] of this.ops) {
      const value = await this.redisClient[method](...args);
      results.push([null, value]);
    }

    this.ops = [];
    return results;
  }
}

class InMemoryTransaction {
  constructor(sharedState, watchedKeys) {
    this.sharedState = sharedState;
    this.watchedKeys = watchedKeys;
    this.operations = [];
  }

  set(key, value, mode, ttlSeconds) {
    this.operations.push({ key, value, mode, ttlSeconds });
    return this;
  }

  async exec() {
    for (const [key, watchedVersion] of this.watchedKeys.entries()) {
      const entry = this.sharedState.store.get(key);
      const currentVersion = entry ? entry.version : 0;

      if (currentVersion !== watchedVersion) {
        this.watchedKeys.clear();
        return null;
      }
    }

    for (const op of this.operations) {
      const entry = {
        value: op.value,
        version: (this.sharedState.store.get(op.key)?.version || 0) + 1,
      };
      this.sharedState.store.set(op.key, entry);

      if (op.mode === 'EX' && typeof op.ttlSeconds === 'number') {
        const timeout = this.sharedState.ttls.get(op.key);
        if (timeout) {
          clearTimeout(timeout);
        }

        const nextTimeout = setTimeout(() => {
          const current = this.sharedState.store.get(op.key);
          if (current && current.version === entry.version) {
            this.sharedState.store.delete(op.key);
          }
          this.sharedState.ttls.delete(op.key);
        }, op.ttlSeconds * 1000);

        if (typeof nextTimeout.unref === 'function') {
          nextTimeout.unref();
        }

        this.sharedState.ttls.set(op.key, nextTimeout);
      }
    }

    this.watchedKeys.clear();
    return this.operations.map(() => ['OK', null]);
  }
}

const sharedState = {
  store: new Map(),
  ttls: new Map(),
  lists: new Map(),
  sortedSets: new Map(),
};

function shouldUseRedis() {
  return Boolean(
    Redis &&
      (process.env.REDIS_URL ||
        process.env.REDIS_HOST ||
        process.env.REDIS_ENABLE === 'true')
  );
}

const useRedis = shouldUseRedis();
const redis = useRedis ? new Redis(process.env.REDIS_URL || undefined) : new InMemoryRedis(sharedState);
const watchClient = useRedis ? new Redis(process.env.REDIS_URL || undefined) : new InMemoryRedis(sharedState);

redis.on('error', (err) => logger.error('Redis', 'Redis error', err));
watchClient.on('error', (err) => logger.error('Redis', 'Redis watch error', err));

module.exports = { redis, watchClient };
