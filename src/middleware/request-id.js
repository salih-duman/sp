const crypto = require('node:crypto');

function requestId(req, res, next) {
  const id = req.get('x-request-id') || crypto.randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);

  next();
}

module.exports = { requestId };
