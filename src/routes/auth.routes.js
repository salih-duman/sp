const express = require('express');

const { env } = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { createUser, findUserByEmail, toPublicUser } = require('../repositories/users');
const { hashPassword, verifyPassword } = require('../services/passwords');
const { signAuthToken } = require('../services/tokens');
const { publishUserRegistered } = require('../services/user-events');
const {
  normalizeEmail,
  normalizeOptionalString,
  validateEmail,
  validateName,
  validatePassword,
} = require('../utils/validators');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  if (!env.registrationEnabled) {
    return res.status(403).json({
      error: {
        code: 'registration_disabled',
        message: 'Registration is disabled.',
      },
    });
  }

  const emailError = validateEmail(req.body?.email);
  const nameError = validateName(req.body?.name);
  const passwordError = validatePassword(req.body?.password);
  const errors = [emailError, nameError, passwordError].filter(Boolean);

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        details: errors,
        message: 'Invalid registration request.',
      },
    });
  }

  try {
    const passwordHash = await hashPassword(req.body.password);
    const user = await createUser({
      email: req.body.email,
      name: normalizeOptionalString(req.body.name),
      passwordHash,
    });

    publishUserRegistered(user).catch((error) => {
      console.error('Failed to publish user.registered event', {
        message: error.message,
        userId: user.id,
      });
    });

    return res.status(201).json({
      token: signAuthToken(user),
      user,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'email_exists',
          message: 'An account already exists for this email address.',
        },
      });
    }

    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const emailError = validateEmail(req.body?.email);
  const passwordError =
    typeof req.body?.password === 'string' ? null : 'Password is required.';
  const errors = [emailError, passwordError].filter(Boolean);

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        details: errors,
        message: 'Invalid login request.',
      },
    });
  }

  try {
    const user = await findUserByEmail(normalizeEmail(req.body.email));

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'invalid_credentials',
          message: 'Email or password is incorrect.',
        },
      });
    }

    const validPassword = await verifyPassword(req.body.password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        error: {
          code: 'invalid_credentials',
          message: 'Email or password is incorrect.',
        },
      });
    }

    const publicUser = toPublicUser(user);

    return res.json({
      token: signAuthToken(publicUser),
      user: publicUser,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
