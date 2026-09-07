const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store'
  });
  await client.connect();

  try {
    console.log("--- Latest Pal Shipments ---");
    const resShipments = await client.query(`
      SELECT s.id, s.order_id, s.order_type, s.trade_type, s.status, s.created_at,
             oa.country_code as origin_country, oa.city as origin_city,
             da.country_code as dest_country, da.city as dest_city
      FROM "pal_shipment" s
      LEFT JOIN "pal_shipment_address" oa ON s.origin_address_id = oa.id
      LEFT JOIN "pal_shipment_address" da ON s.destination_address_id = da.id
      ORDER BY s.created_at DESC LIMIT 5
    `);
    console.log(JSON.stringify(resShipments.rows, null, 2));

  } catch (err) {
    console.error("PG error:", err);
  } finally {
    await client.end();
  }
}
main();
