const path = require('node:path');

require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env'),
  quiet: true,
});

function required(name) {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseBoolean(name, defaultValue = false) {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseInteger(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}

function parseTrustProxy(value) {
  if (value === undefined || value === '') {
    return 'loopback';
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  bcryptRounds: parseInteger('BCRYPT_ROUNDS', 12),
  databaseSsl: parseBoolean('DATABASE_SSL', false),
  databaseUrl: required('DATABASE_URL'),
  host: process.env.HOST || '127.0.0.1',
  isProduction: nodeEnv === 'production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtSecret: required('JWT_SECRET'),
  nodeEnv,
  port: parseInteger('PORT', 3000),
  queueEnabled: parseBoolean('QUEUE_ENABLED', false),
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE || 'app.events',
  rabbitmqUrl: process.env.RABBITMQ_URL || '',
  rabbitmqUserRegisteredQueue:
    process.env.RABBITMQ_USER_REGISTERED_QUEUE || 'user.registered',
  redisUrl: process.env.REDIS_URL || '',
  registrationEnabled: parseBoolean('REGISTRATION_ENABLED', true),
  requireHttps: parseBoolean('REQUIRE_HTTPS', false),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
};

if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (env.bcryptRounds < 10 || env.bcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS must be between 10 and 15');
}

if (env.queueEnabled && !env.rabbitmqUrl) {
  throw new Error('RABBITMQ_URL is required when QUEUE_ENABLED=true');
}

module.exports = { env };
