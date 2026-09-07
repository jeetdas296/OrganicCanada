const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store'
  });
  await client.connect();

  try {
    // 1. Get stock location address for European Warehouse (DK)
    const resStock = await client.query(`
      SELECT sl.id, sl.name, sla.country_code, sla.city, sla.address_1, sla.postal_code
      FROM "stock_location" sl
      JOIN "stock_location_address" sla ON sl.address_id = sla.id
      WHERE sl.id = 'sloc_01KHBQ855DTDVV3S8FQ0QB9NNT'
    `);
    console.log("Stock location:", resStock.rows[0]);

    // 2. Get order shipping address for order_01KPNJT6XK7J056GQ2470D7R0C
    const resOrder = await client.query(`
      SELECT o.id, oa.country_code, oa.city, oa.address_1, oa.postal_code
      FROM "order" o
      JOIN "order_address" oa ON o.shipping_address_id = oa.id
      WHERE o.id = 'order_01KPNJT6XK7J056GQ2470D7R0C'
    `);
    console.log("Order shipping address:", resOrder.rows[0]);

  } catch (err) {
    console.error("PG error:", err);
  } finally {
    await client.end();
  }
}
main();
