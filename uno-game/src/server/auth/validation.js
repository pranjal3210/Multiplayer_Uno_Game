const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateRegistration({ username, email, password } = {}) {
  const errors = [];
  const safeUsername = normalizeUsername(username);
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || '');

  if (!USERNAME_RE.test(safeUsername)) {
    errors.push('Username must be 3-20 characters and use letters, numbers, or underscores');
  }

  if (!EMAIL_RE.test(safeEmail)) {
    errors.push('Email must be valid');
  }

  if (safePassword.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: { username: safeUsername, email: safeEmail, password: safePassword },
  };
}

function validateLogin({ email, password } = {}) {
  const errors = [];
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || '');

  if (!EMAIL_RE.test(safeEmail)) {
    errors.push('Email must be valid');
  }

  if (!safePassword) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: { email: safeEmail, password: safePassword },
  };
}

module.exports = { normalizeEmail, normalizeUsername, validateRegistration, validateLogin };
