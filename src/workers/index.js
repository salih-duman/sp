const { env } = require('../config/env');
const { closePool } = require('../db/pool');
const { routingKeys } = require('../queues/events');
const { closeRabbit, consumeEventQueue } = require('../queues/rabbitmq');

let shuttingDown = false;

async function handleUserRegistered(event) {
  const user = event.payload?.user;

  console.info(
    JSON.stringify({
      email: user?.email,
      eventId: event.id,
      message: 'Handled user.registered event',
      userId: user?.id,
    }),
  );
}

async function handleEvent(event) {
  switch (event.routingKey) {
    case routingKeys.userRegistered:
      await handleUserRegistered(event);
      break;
    default:
      throw new Error(`Unhandled routing key: ${event.routingKey}`);
  }
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received, shutting down worker`);

  await closeRabbit();
  await closePool();

  process.exit(exitCode);
}

async function main() {
  await consumeEventQueue({
    handler: handleEvent,
    queue: env.rabbitmqUserRegisteredQueue,
    routingKeys: [routingKeys.userRegistered],
  });

  console.log(
    `Worker consuming ${env.rabbitmqUserRegisteredQueue} from ${env.rabbitmqExchange}`,
  );
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled worker promise rejection', error);
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught worker exception', error);
  shutdown('uncaughtException', 1);
});

main().catch((error) => {
  console.error('Worker failed to start', error);
  shutdown('startupFailure', 1);
});
