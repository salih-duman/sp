process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://app_user:change_me@localhost:5432/app_db';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

const assert = require('node:assert/strict');
const test = require('node:test');

const { hashPassword, verifyPassword } = require('../src/services/passwords');
const { createEvent } = require('../src/queues/rabbitmq');
const { createRateLimiter, hashIdentifier } = require('../src/middleware/rate-limit');
const { signAuthToken, verifyAuthToken } = require('../src/services/tokens');
const {
  normalizeEmail,
  validateEmail,
  validatePassword,
} = require('../src/utils/validators');

test('normalizes email addresses', () => {
  assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com');
});

test('validates email addresses', () => {
  assert.equal(validateEmail('user@example.com'), null);
  assert.equal(validateEmail('not-an-email'), 'A valid email address is required.');
});

test('validates password length', () => {
  assert.equal(validatePassword('long-enough-password'), null);
  assert.equal(
    validatePassword('short'),
    'Password must be at least 12 characters.',
  );
});

test('hashes and verifies passwords with bcrypt', async () => {
  const passwordHash = await hashPassword('correct-horse-password');

  assert.equal(await verifyPassword('correct-horse-password', passwordHash), true);
  assert.equal(await verifyPassword('wrong-password', passwordHash), false);
});

test('signs and verifies JWT auth tokens', () => {
  const token = signAuthToken({
    id: '6243fbd9-022a-4ac2-9470-9fd6f92910ff',
    email: 'user@example.com',
    role: 'user',
  });

  const payload = verifyAuthToken(token);

  assert.equal(payload.sub, '6243fbd9-022a-4ac2-9470-9fd6f92910ff');
  assert.equal(payload.email, 'user@example.com');
  assert.equal(payload.role, 'user');
});

test('creates queue events with metadata', () => {
  const event = createEvent('user.registered', {
    user: {
      id: '6243fbd9-022a-4ac2-9470-9fd6f92910ff',
      email: 'user@example.com',
    },
  });

  assert.match(event.id, /^[0-9a-f-]{36}$/);
  assert.equal(event.routingKey, 'user.registered');
  assert.equal(event.payload.user.email, 'user@example.com');
  assert.doesNotThrow(() => new Date(event.occurredAt).toISOString());
});

test('hashes rate limit identifiers without exposing raw values', () => {
  const hash = hashIdentifier('127.0.0.1:user@example.com');

  assert.equal(hash.length, 64);
  assert.notEqual(hash, '127.0.0.1:user@example.com');
});

test('rate limiter blocks requests after the configured limit', async () => {
  const limiter = createRateLimiter({
    identifier: () => 'unit-test-user',
    keyPrefix: 'rate-limit:test',
    limit: 1,
    windowSeconds: 60,
  });

  const req = { body: {}, get: () => undefined, ip: '127.0.0.1' };
  const first = createMockResponse();
  let nextCalls = 0;

  await limiter(req, first, () => {
    nextCalls += 1;
  });

  const second = createMockResponse();

  await limiter(req, second, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(second.body.error.code, 'rate_limit_exceeded');
});

function createMockResponse() {
  return {
    body: null,
    headers: {},
    statusCode: 200,
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}
