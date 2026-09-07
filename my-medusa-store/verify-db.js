const { Pool } = require('pg');

async function checkDatabase() {
  const pool = new Pool({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store',
  });

  try {
    const resShipment = await pool.query('SELECT * FROM pal_shipment;');
    console.log(`pal_shipment table exists. Row count: ${resShipment.rowCount}`);
    
    const resPackage = await pool.query('SELECT * FROM pal_package;');
    console.log(`pal_package table exists. Row count: ${resPackage.rowCount}`);
    
    const resAddresses = await pool.query('SELECT * FROM pal_shipment_address;');
    console.log(`pal_shipment_address table exists. Row count: ${resAddresses.rowCount}`);
    
    const resStatus = await pool.query('SELECT * FROM pal_shipment_status_history;');
    console.log(`pal_shipment_status_history table exists. Row count: ${resStatus.rowCount}`);
    
    const resBooking = await pool.query('SELECT * FROM pal_provider_booking;');
    console.log(`pal_provider_booking table exists. Row count: ${resBooking.rowCount}`);
    
    // Test a relationship query using joins
    const resJoin = await pool.query(`
      SELECT p0.id, p1.id as package_id
      FROM pal_shipment p0
      LEFT JOIN pal_package p1 ON p0.id = p1.shipment_id
    `);
    console.log(`Relationship query success. Rows returned: ${resJoin.rowCount}`);
    
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkDatabase();
