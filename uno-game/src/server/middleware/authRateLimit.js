const { isRateLimited } = require('../rateLimiter');

function authRateLimit(req, res, next) {
  const identifier = req.ip || req.headers['x-forwarded-for'] || 'auth';

  isRateLimited(identifier, 'auth_http', 8, 60)
    .then((blocked) => {
      if (blocked) {
        res.status(429).json({ error: 'Too many auth attempts. Try again later.' });
        return;
      }

      next();
    })
    .catch(next);
}

module.exports = { authRateLimit };
