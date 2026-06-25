const crypto = require('node:crypto');

const { env } = require('../config/env');
const { getRedisClient } = require('../cache/redis');

const memoryBuckets = new Map();

function hashIdentifier(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getClientIp(req) {
  return req.ip || req.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function getAuthIdentifier(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
  return `${getClientIp(req)}:${email}`;
}

function cleanupMemoryBuckets(now) {
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}

function consumeMemoryBucket(key, limit, windowSeconds) {
  const now = Date.now();
  cleanupMemoryBuckets(now);

  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    };
    memoryBuckets.set(key, bucket);
    return bucket;
  }

  existing.count += 1;
  return existing;
}

async function consumeRedisBucket(key, limit, windowSeconds) {
  const redis = await getRedisClient();

  if (!redis) {
    return null;
  }

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    count,
    resetAt: Date.now() + Math.max(ttl, 0) * 1000,
  };
}

function createRateLimiter({ identifier = getClientIp, keyPrefix, limit, windowSeconds }) {
  return async function rateLimiter(req, res, next) {
    if (!env.rateLimitEnabled) {
      return next();
    }

    const rawIdentifier = identifier(req);
    const key = `${keyPrefix}:${hashIdentifier(rawIdentifier)}`;
    let bucket;

    try {
      bucket = await consumeRedisBucket(key, limit, windowSeconds);
    } catch (error) {
      console.warn('Redis rate limit failed, using memory fallback', {
        message: error.message,
      });
    }

    if (!bucket) {
      bucket = consumeMemoryBucket(key, limit, windowSeconds);
    }

    const remaining = Math.max(limit - bucket.count, 0);
    const retryAfterSeconds = Math.max(
      Math.ceil((bucket.resetAt - Date.now()) / 1000),
      1,
    );

    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', retryAfterSeconds);

    if (bucket.count > limit) {
      res.setHeader('Retry-After', retryAfterSeconds);

      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Try again later.',
          retryAfterSeconds,
        },
      });
    }

    return next();
  };
}

const authRateLimiter = createRateLimiter({
  identifier: getAuthIdentifier,
  keyPrefix: 'rate-limit:auth',
  limit: env.authRateLimitMaxRequests,
  windowSeconds: env.authRateLimitWindowSeconds,
});

module.exports = {
  authRateLimiter,
  createRateLimiter,
  hashIdentifier,
};
