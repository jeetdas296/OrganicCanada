const { Client } = require('pg');

async function verify() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store',
  });
  
  await client.connect();
  
  try {
    const res1 = await client.query("SELECT to_regclass('public.pal_shipment_timeline');");
    console.log('pal_shipment_timeline:', res1.rows[0].to_regclass);
    
    const res2 = await client.query("SELECT to_regclass('public.pal_shipment_timeline_step');");
    console.log('pal_shipment_timeline_step:', res2.rows[0].to_regclass);
    
    const res3 = await client.query("SELECT COUNT(*) FROM pal_shipment;");
    console.log('pal_shipment count:', res3.rows[0].count);
    
    const res4 = await client.query("SELECT id FROM pal_shipment WHERE id = '01M0S5753C80C4FJXAVRB5WKCV';");
    console.log('shipment 01M0S5753C80C4FJXAVRB5WKCV exists:', res4.rows.length > 0);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

verify();
