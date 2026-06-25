const { env } = require('../config/env');

function securityHeaders(req, res, next) {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
}

function requireHttps(req, res, next) {
  if (!env.requireHttps) {
    return next();
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const secure = req.secure || forwardedProto === 'https';

  if (secure) {
    return next();
  }

  return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
}

module.exports = {
  requireHttps,
  securityHeaders,
};
