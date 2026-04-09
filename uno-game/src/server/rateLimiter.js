const { redis } = require('./redisClient');
const logger = require('./logger');

async function isRateLimited(socketId, event, limit = 10, windowSecs = 5) {
  const key = `ratelimit:${socketId}:${event}`;
  const now = Date.now();
  const windowStart = now - windowSecs * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSecs * 2);

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] ?? 0;

  if (count > limit) {
    logger.warn('RateLimit', `${event} blocked`, {
      socketId: socketId.slice(0, 8),
      count,
      limit,
    });
    return true;
  }

  return false;
}

function withRateLimit(socket, event, limit, windowSecs, handler) {
  socket.on(event, async (...args) => {
    try {
      const blocked = await isRateLimited(socket.id, event, limit, windowSecs);
      if (blocked) {
        socket.emit('rate_limited', {
          event,
          message: `Slow down! ${event} too fast.`,
          retryAfter: windowSecs,
        });
        return;
      }

      await handler(...args);
    } catch (error) {
      logger.error('RateLimit', `${event} handler failed`, error);
      socket.emit('error', error.message);
    }
  });
}

module.exports = { isRateLimited, withRateLimit };
