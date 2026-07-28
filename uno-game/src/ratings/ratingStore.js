const { redis } = require('../server/redisClient');
const { DEFAULT } = require('./elo');
const { findUserById, updateUserRating } = require('../server/models/userStore');

const RATING_KEY = (playerName) => `rating:${playerName}`;
const LEADERBOARD_KEY = 'leaderboard';

async function getRating(playerName) {
  const user = await findUserById(playerName);
  if (user) {
    return user.rating;
  }

  const value = await redis.get(RATING_KEY(playerName));
  return value ? Number.parseInt(value, 10) : DEFAULT;
}

async function setRating(playerName, rating) {
  const user = await updateUserRating(playerName, rating);
  if (user) {
    return;
  }

  await redis.set(RATING_KEY(playerName), String(rating));
}

async function getMultipleRatings(playerNames) {
  const ratings = {};

  for (const name of playerNames) {
    ratings[name] = await getRating(name);
  }

  return ratings;
}

async function updateLeaderboard(playerName, rating) {
  await redis.zadd(LEADERBOARD_KEY, rating, playerName);
}

async function getLeaderboard(top = 10) {
  const results = await redis.zrevrange(LEADERBOARD_KEY, 0, top - 1, 'WITHSCORES');
  const leaderboard = [];

  for (let i = 0; i < results.length; i += 2) {
    leaderboard.push({
      name: results[i],
      rating: Number.parseInt(results[i + 1], 10),
      rank: i / 2 + 1,
    });
  }

  return leaderboard;
}

module.exports = {
  getRating,
  setRating,
  getMultipleRatings,
  updateLeaderboard,
  getLeaderboard,
};
