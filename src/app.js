const express = require('express');
const path = require('node:path');

const { env } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errors');
const { requestId } = require('./middleware/request-id');
const { requestLogger } = require('./middleware/request-logger');
const { requireHttps, securityHeaders } = require('./middleware/security');
const routes = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use(requestId);
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(requireHttps);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  app.use('/api', routes);
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
