const { Pool } = require('pg');

const { env } = require('../config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: env.databaseSsl ? { rejectUnauthorized: true } : undefined,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
});

function query(text, params) {
  return pool.query(text, params);
}

async function closePool() {
  await pool.end();
}

module.exports = {
  closePool,
  pool,
  query,
};
