const { verifyToken } = require('../auth/token');
const { findUserById, publicUser } = require('../models/userStore');

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function authenticate(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = publicUser(user);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { authenticate };
