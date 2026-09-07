const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-ur5h' // Note: This might not be the correct DB name, let me check medusa-config.ts first
});

async function run() {
  try {
    const res = await pool.query('SELECT id FROM pal_provider');
    console.log("Providers in pal_provider:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
