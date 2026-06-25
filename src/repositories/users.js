const { query } = require('../db/pool');
const { normalizeEmail } = require('../utils/validators');

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

async function createUser({ email, name, passwordHash }) {
  const result = await query(
    `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, role, created_at
    `,
    [normalizeEmail(email), name, passwordHash],
  );

  return toPublicUser(result.rows[0]);
}

async function findUserByEmail(email) {
  const result = await query(
    `
      SELECT id, email, name, role, password_hash, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await query(
    `
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  return toPublicUser(result.rows[0]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  toPublicUser,
};
