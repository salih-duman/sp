const fs = require('node:fs');
const path = require('node:path');

const { closePool, query } = require('./pool');

async function migrate() {
  const migrationsDir = path.resolve(__dirname, '../../sql');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration ${file}`);
    await query(sql);
  }

  console.log('Database migrations complete');
}

migrate()
  .catch((error) => {
    console.error('Database migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
