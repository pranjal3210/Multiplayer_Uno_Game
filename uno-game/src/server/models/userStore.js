const { redis } = require('../redisClient');

const USER_KEY = (id) => `user:${id}`;
const EMAIL_KEY = (email) => `user:email:${email}`;
const USERNAME_KEY = (username) => `user:username:${username.toLowerCase()}`;
const USER_ID_SEQUENCE = 'user:id:sequence';
const DEFAULT_RATING = 1200;

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    rating: user.rating,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function saveUser(user) {
  await redis.set(USER_KEY(user.id), JSON.stringify(user));
  await redis.set(EMAIL_KEY(user.email), user.id);
  await redis.set(USERNAME_KEY(user.username), user.id);
  return user;
}

async function findUserById(id) {
  const raw = await redis.get(USER_KEY(id));
  return raw ? JSON.parse(raw) : null;
}

async function findUserByEmail(email) {
  const id = await redis.get(EMAIL_KEY(email));
  return id ? findUserById(id) : null;
}

async function findUserByUsername(username) {
  const id = await redis.get(USERNAME_KEY(username));
  return id ? findUserById(id) : null;
}

async function createUser({ username, email, passwordHash }) {
  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const existingUsername = await findUserByUsername(username);
  if (existingUsername) {
    const error = new Error('Username already taken');
    error.status = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const sequence = await redis.incr(USER_ID_SEQUENCE);
  const user = {
    id: String(sequence),
    username,
    email,
    passwordHash,
    rating: DEFAULT_RATING,
    createdAt: now,
    updatedAt: now,
  };

  return saveUser(user);
}

async function updateUserRating(id, rating) {
  const user = await findUserById(id);
  if (!user) {
    return null;
  }

  user.rating = rating;
  user.updatedAt = new Date().toISOString();
  await saveUser(user);
  return user;
}

module.exports = {
  DEFAULT_RATING,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  publicUser,
  updateUserRating,
};
