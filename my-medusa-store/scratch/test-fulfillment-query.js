const { init } = require('@medusajs/framework');
const path = require('path');

async function main() {
  const medusa = await init(path.join(__dirname, '..'), {});
  const container = medusa.container;
  const query = container.resolve("query");

  try {
    console.log("--- 1. Order ---");
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "items.variant.*", "fulfillments.*"],
      filters: { id: "order_01KPNJT6XK7J056GQ2470D7R0C" }
    });
    console.log(JSON.stringify(orders, null, 2));

    console.log("--- 2. Fulfillments ---");
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "location_id", "items.*", "order_id"],
    });
    console.log(JSON.stringify(fulfillments.slice(0, 2), null, 2));

    console.log("--- 3. Stock Locations ---");
    const { data: stock_locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "address.*"]
    });
    console.log(JSON.stringify(stock_locations, null, 2));

    console.log("--- 4. Inventory Levels ---");
    const { data: inventory_levels } = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "location_id", "stocked_quantity", "reserved_quantity", "available_quantity"]
    });
    console.log(JSON.stringify(inventory_levels.slice(0, 5), null, 2));

    console.log("--- 5. Vendors ---");
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "locations.*"] // Check if they have a locations relation
    }).catch(() => ({ data: "Vendor query failed" }));
    console.log(JSON.stringify(vendors, null, 2));

  } catch (e) {
    console.error("Query Error:", e);
  }
  process.exit(0);
}
main();
