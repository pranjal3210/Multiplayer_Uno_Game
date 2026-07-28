const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '7d';

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'development-jwt-secret';
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = { signToken, verifyToken };
