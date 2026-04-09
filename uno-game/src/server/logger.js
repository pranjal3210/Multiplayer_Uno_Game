const isDev = process.env.NODE_ENV !== 'production';

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL = isDev ? LEVELS.DEBUG : LEVELS.INFO;

const colors = {
  DEBUG: '\x1b[90m',
  INFO: '\x1b[36m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  RESET: '\x1b[0m',
};

function formatData(data) {
  if (data instanceof Error) {
    return data.stack || data.message;
  }

  if (typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch (error) {
      return String(data);
    }
  }

  return data;
}

function log(level, context, message, data = null) {
  if (LEVELS[level] < MIN_LEVEL) {
    return;
  }

  const time = new Date().toTimeString().slice(0, 8);
  const prefix = `${colors[level]}[${level}]${colors.RESET}`;
  const ctx = `\x1b[90m[${context}]${colors.RESET}`;
  const line = `${time} ${prefix} ${ctx} ${message}`;

  if (data !== null && data !== undefined) {
    console.log(line, formatData(data));
    return;
  }

  console.log(line);
}

const logger = {
  debug: (ctx, msg, data) => log('DEBUG', ctx, msg, data),
  info: (ctx, msg, data) => log('INFO', ctx, msg, data),
  warn: (ctx, msg, data) => log('WARN', ctx, msg, data),
  error: (ctx, msg, data) => log('ERROR', ctx, msg, data),
};

module.exports = logger;
