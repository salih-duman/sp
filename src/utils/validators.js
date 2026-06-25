const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized || normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return 'A valid email address is required.';
  }

  return null;
}

function validateName(name) {
  const normalized = normalizeOptionalString(name);

  if (normalized && normalized.length > 100) {
    return 'Name must be 100 characters or fewer.';
  }

  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return 'Password is required.';
  }

  if (password.length < 12) {
    return 'Password must be at least 12 characters.';
  }

  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }

  return null;
}

module.exports = {
  normalizeEmail,
  normalizeOptionalString,
  validateEmail,
  validateName,
  validatePassword,
};
