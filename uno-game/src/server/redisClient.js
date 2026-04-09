let Redis;

try {
  // Prefer the real Redis client when the dependency is installed.
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

  async set(key, value, mode, ttlSeconds) {
    const entry = {
      value,
      version: (this.sharedState.store.get(key)?.version || 0) + 1,
    };

    this.sharedState.store.set(key, entry);

    if (mode === 'EX' && typeof ttlSeconds === 'number') {
      const timeout = this.sharedState.ttls.get(key);
      if (timeout) {
        clearTimeout(timeout);
      }

      const nextTimeout = setTimeout(() => {
        const current = this.sharedState.store.get(key);
        if (current && current.version === entry.version) {
          this.sharedState.store.delete(key);
        }
        this.sharedState.ttls.delete(key);
      }, ttlSeconds * 1000);

      if (typeof nextTimeout.unref === 'function') {
        nextTimeout.unref();
      }

      this.sharedState.ttls.set(key, nextTimeout);
    }

    return 'OK';
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
};

const redis = Redis ? new Redis() : new InMemoryRedis(sharedState);
const watchClient = Redis ? new Redis() : new InMemoryRedis(sharedState);

redis.on('error', (err) => console.error('Redis error:', err));
watchClient.on('error', (err) => console.error('Redis watch error:', err));

module.exports = { redis, watchClient };
