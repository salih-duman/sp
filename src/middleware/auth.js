const { findUserById } = require('../repositories/users');
const { verifyAuthToken } = require('../services/tokens');

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Bearer token is required.',
      },
    });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'User no longer exists.',
        },
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Bearer token is invalid or expired.',
        },
      });
    }

    return next(error);
  }
}

module.exports = {
  requireAuth,
};
