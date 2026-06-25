const { createApp } = require('./app');
const { closeRedis } = require('./cache/redis');
const { env } = require('./config/env');
const { closePool } = require('./db/pool');
const { closeRabbit } = require('./queues/rabbitmq');

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  console.log(
    `API listening on http://${env.host}:${env.port} in ${env.nodeEnv} mode`,
  );
});

let shuttingDown = false;

server.on('error', (error) => {
  console.error('Server failed to start', {
    code: error.code,
    message: error.message,
  });
  process.exit(1);
});

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  const forceShutdown = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  forceShutdown.unref();

  server.close(async () => {
    await closeRabbit();
    await closeRedis();
    await closePool();
    clearTimeout(forceShutdown);
    process.exit(exitCode);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection', error);
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
  shutdown('uncaughtException', 1);
});
