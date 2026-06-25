const express = require('express');

const { query } = require('../db/pool');
const { env } = require('../config/env');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    environment: env.nodeEnv,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.get('/ready', async (req, res, next) => {
  try {
    await query('SELECT 1');

    res.json({
      database: 'ok',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (cause) {
    const error = new Error('Database connection failed');
    error.status = 503;
    error.code = 'database_unavailable';
    error.cause = cause;
    next(error);
  }
});

module.exports = router;
