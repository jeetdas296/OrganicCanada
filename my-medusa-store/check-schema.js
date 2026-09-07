const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store' });
async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'pal_shipment';
  `);
  console.log('pal_shipment schema:', res.rows);
  
  const resPkg = await pool.query(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'pal_package';
  `);
  console.log('pal_package schema:', resPkg.rows);
  
  const resFk = await pool.query(`
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='pal_package';
  `);
  console.log('Foreign Keys for pal_package:', JSON.stringify(resFk.rows, null, 2));
  pool.end();
}
run();
