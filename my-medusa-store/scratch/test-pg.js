const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store'
  });
  await client.connect();

  try {
    console.log("--- Tables ---");
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'order%' OR table_name LIKE 'fulfillment%' OR table_name LIKE 'inventory%')
    `);
    console.log(resTables.rows.map(r => r.table_name));

    console.log("--- 2. Fulfillments ---");
    // Just select from fulfillment limit 5
    const resFulfillment = await client.query(`SELECT * FROM "fulfillment" LIMIT 2`);
    console.log(resFulfillment.rows);

    console.log("--- 3. Stock Locations ---");
    const resStockLocations = await client.query(`
      SELECT sl.id, sl.name, sla.country_code 
      FROM "stock_location" sl
      LEFT JOIN "stock_location_address" sla ON sl.address_id = sla.id
    `);
    console.log(resStockLocations.rows);

    console.log("--- 4. Inventory Levels ---");
    const resInventory = await client.query(`SELECT id, inventory_item_id, location_id, stocked_quantity, reserved_quantity FROM "inventory_level" LIMIT 5`);
    console.log(resInventory.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
