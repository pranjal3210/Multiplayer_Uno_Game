const { redis } = require('../server/redisClient');

const QUEUE_KEY = 'matchmaking:queue';
const MATCH_SIZE = 2;

function buildRoomId() {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `room_${stamp}_${random}`;
}

async function enqueue(socketId, playerName) {
  const entry = JSON.stringify({
    socketId,
    playerName,
    joinedAt: Date.now(),
  });

  await redis.rpush(QUEUE_KEY, entry);
  console.log(`Queued: ${playerName}`);
}

async function dequeue(socketId) {
  const items = await redis.lrange(QUEUE_KEY, 0, -1);

  for (const item of items) {
    const parsed = JSON.parse(item);
    if (parsed.socketId === socketId) {
      await redis.lrem(QUEUE_KEY, 1, item);
      console.log(`Dequeued: ${parsed.playerName}`);
      return parsed;
    }
  }

  return null;
}

async function tryMatch() {
  const queueLength = await redis.llen(QUEUE_KEY);
  if (queueLength < MATCH_SIZE) {
    return null;
  }

  const players = [];
  for (let i = 0; i < MATCH_SIZE; i += 1) {
    const raw = await redis.lpop(QUEUE_KEY);
    if (raw) {
      players.push(JSON.parse(raw));
    }
  }

  if (players.length < MATCH_SIZE) {
    for (const player of players) {
      await redis.rpush(QUEUE_KEY, JSON.stringify(player));
    }
    return null;
  }

  const roomId = buildRoomId();
  console.log(`Match found in ${roomId}: ${players.map((p) => p.playerName).join(', ')}`);

  return { roomId, players };
}

async function getQueueLength() {
  return redis.llen(QUEUE_KEY);
}

module.exports = { enqueue, dequeue, tryMatch, getQueueLength };
