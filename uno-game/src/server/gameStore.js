const { redis, watchClient } = require('./redisClient');

const KEY = (roomId) => `game:${roomId}`;
const PLAYER_KEY = (playerName) => `player:${playerName}`;
const TTL = 60 * 60 * 2;

async function saveState(roomId, engineState) {
  const serialized = JSON.stringify(engineState);
  await redis.set(KEY(roomId), serialized, 'EX', TTL);
}

async function loadState(roomId) {
  const data = await redis.get(KEY(roomId));
  return data ? JSON.parse(data) : null;
}

async function atomicUpdate(roomId, callback, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const roomKey = KEY(roomId);

    await watchClient.watch(roomKey);

    try {
      const raw = await watchClient.get(roomKey);
      const currentState = raw ? JSON.parse(raw) : null;
      const newState = await callback(currentState);

      if (newState === null) {
        await watchClient.unwatch();
        return { success: false, reason: 'invalid_move' };
      }

      const pipeline = watchClient.multi();
      pipeline.set(roomKey, JSON.stringify(newState), 'EX', TTL);

      const results = await pipeline.exec();
      if (results === null) {
        await watchClient.unwatch();
        console.log(`Retry attempt ${attempt + 1} for room ${roomId}`);
        continue;
      }

      return { success: true, state: newState };
    } catch (error) {
      await watchClient.unwatch();
      throw error;
    }
  }

  return { success: false, reason: 'max_retries_exceeded' };
}

async function setPlayerRoom(playerName, roomId) {
  await redis.set(PLAYER_KEY(playerName), roomId, 'EX', TTL);
}

async function getPlayerRoom(playerName) {
  return redis.get(PLAYER_KEY(playerName));
}

module.exports = {
  saveState,
  loadState,
  atomicUpdate,
  setPlayerRoom,
  getPlayerRoom,
};
