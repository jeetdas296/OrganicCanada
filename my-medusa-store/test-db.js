const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store' });
(async () => {
  try {
    const addrRes = await pool.query("SELECT id, address_1, city, country_code, province, company FROM order_address LIMIT 10");
    console.log("Order Addresses sample:", JSON.stringify(addrRes.rows, null, 2));

    const palAddrRes = await pool.query("SELECT id, address_1, city, country_code, type FROM pal_shipment_address LIMIT 10");
    console.log("PAL Shipment Addresses sample:", JSON.stringify(palAddrRes.rows, null, 2));

    pool.end();
  } catch(e) {
    console.error(e);
  }
})();
