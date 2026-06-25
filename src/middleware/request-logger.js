const { env } = require('../config/env');

function requestLogger(req, res, next) {
  if (env.nodeEnv === 'test') {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.info(
      JSON.stringify({
        durationMs: Number(durationMs.toFixed(2)),
        method: req.method,
        path: req.originalUrl,
        requestId: req.id,
        status: res.statusCode,
      }),
    );
  });

  return next();
}

module.exports = { requestLogger };
