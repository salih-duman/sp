const crypto = require('node:crypto');

const amqp = require('amqplib');

const { env } = require('../config/env');

let connectionPromise;

function isEnabled() {
  return env.queueEnabled && Boolean(env.rabbitmqUrl);
}

async function getConnection() {
  if (!isEnabled()) {
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = amqp
      .connect(env.rabbitmqUrl)
      .then((connection) => {
        connection.on('error', (error) => {
          console.error('RabbitMQ connection error', { message: error.message });
        });

        connection.on('handler-error', (error, event) => {
          console.error('RabbitMQ connection handler error', {
            event,
            message: error.message,
          });
        });

        connection.on('close', () => {
          connectionPromise = null;
          console.warn('RabbitMQ connection closed');
        });

        console.info('RabbitMQ connected');

        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

async function createChannel({ confirm = false } = {}) {
  const connection = await getConnection();

  if (!connection) {
    return null;
  }

  const channel = confirm
    ? await connection.createConfirmChannel()
    : await connection.createChannel();

  channel.on('error', (error) => {
    console.error('RabbitMQ channel error', { message: error.message });
  });

  channel.on('handler-error', (error, event) => {
    console.error('RabbitMQ channel handler error', {
      event,
      message: error.message,
    });
  });

  await channel.assertExchange(env.rabbitmqExchange, 'topic', { durable: true });

  return channel;
}

function createEvent(routingKey, payload) {
  return {
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    payload,
    routingKey,
  };
}

async function publishEvent(routingKey, payload) {
  if (!isEnabled()) {
    return false;
  }

  let channel;

  try {
    channel = await createChannel({ confirm: true });

    if (!channel) {
      return false;
    }

    const event = createEvent(routingKey, payload);
    const body = Buffer.from(JSON.stringify(event));

    channel.publish(env.rabbitmqExchange, routingKey, body, {
      contentType: 'application/json',
      messageId: event.id,
      persistent: true,
      timestamp: Date.now(),
      type: routingKey,
    });

    await channel.waitForConfirms();

    return true;
  } catch (error) {
    console.error('RabbitMQ publish failed', {
      message: error.message,
      routingKey,
    });

    return false;
  } finally {
    if (channel) {
      await channel.close().catch(() => {});
    }
  }
}

async function consumeEventQueue({ handler, queue, routingKeys }) {
  if (!isEnabled()) {
    throw new Error('RabbitMQ is disabled. Set QUEUE_ENABLED=true and RABBITMQ_URL.');
  }

  const channel = await createChannel();

  await channel.assertQueue(queue, { durable: true });

  for (const routingKey of routingKeys) {
    await channel.bindQueue(queue, env.rabbitmqExchange, routingKey);
  }

  channel.prefetch(5);

  await channel.consume(
    queue,
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(message.content.toString('utf8'));
        await handler(event, message);
        channel.ack(message);
      } catch (error) {
        console.error('RabbitMQ consumer failed', {
          message: error.message,
          queue,
        });
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );

  return channel;
}

async function closeRabbit() {
  if (!connectionPromise) {
    return;
  }

  const connection = await connectionPromise.catch(() => null);
  connectionPromise = null;

  if (connection) {
    await connection.close().catch(() => {});
  }
}

module.exports = {
  closeRabbit,
  consumeEventQueue,
  createEvent,
  publishEvent,
};
