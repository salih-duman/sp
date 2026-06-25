const jwt = require('jsonwebtoken');

const { env } = require('../config/env');

const issuer = 'dev-duman-api';
const audience = 'dev-duman-client';

function signAuthToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      audience,
      expiresIn: env.jwtExpiresIn,
      issuer,
      subject: user.id,
    },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    audience,
    issuer,
  });
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
