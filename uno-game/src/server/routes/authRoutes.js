const express = require('express');
const bcrypt = require('bcrypt');
const { signToken } = require('../auth/token');
const { authenticate } = require('../middleware/authenticate');
const { authRateLimit } = require('../middleware/authRateLimit');
const { validateLogin, validateRegistration } = require('../auth/validation');
const { createUser, findUserByEmail, publicUser } = require('../models/userStore');
const { updateLeaderboard } = require('../../ratings/ratingStore');

const router = express.Router();
const SALT_ROUNDS = 12;

function authResponse(user) {
  return {
    token: signToken(user),
    user: publicUser(user),
  };
}

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    const passwordHash = await bcrypt.hash(validation.value.password, SALT_ROUNDS);
    const user = await createUser({
      username: validation.value.username,
      email: validation.value.email,
      passwordHash,
    });

    await updateLeaderboard(user.username, user.rating);
    return res.status(201).json(authResponse(user));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    return next(error);
  }
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    const user = await findUserByEmail(validation.value.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(validation.value.password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json(authResponse(user));
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req, res) => {
  return res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    rating: req.user.rating,
  });
});

module.exports = { authRouter: router };
