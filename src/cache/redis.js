const { createClient } = require('redis');

const { env } = require('../config/env');

let clientPromise;
let unavailableUntil = 0;

function isRedisConfigured() {
  return Boolean(env.redisUrl);
}

function isTemporarilyUnavailable() {
  return Date.now() < unavailableUntil;
}

function markTemporarilyUnavailable() {
  unavailableUntil = Date.now() + 30000;
}

async function getRedisClient() {
  if (!isRedisConfigured() || isTemporarilyUnavailable()) {
    return null;
  }

  if (!clientPromise) {
    const client = createClient({
      socket: {
        reconnectStrategy: false,
      },
      url: env.redisUrl,
    });

    client.on('error', (error) => {
      console.error('Redis client error', { message: error.message });
      markTemporarilyUnavailable();
    });

    clientPromise = client
      .connect()
      .then(() => {
        console.info('Redis connected');
        return client;
      })
      .catch((error) => {
        clientPromise = null;
        markTemporarilyUnavailable();
        console.warn('Redis connection failed', { message: error.message });
        return null;
      });
  }

  return clientPromise;
}

async function closeRedis() {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise.catch(() => null);
  clientPromise = null;

  if (client?.isOpen) {
    await client.quit().catch(() => {});
  }
}

module.exports = {
  closeRedis,
  getRedisClient,
  isRedisConfigured,
};
