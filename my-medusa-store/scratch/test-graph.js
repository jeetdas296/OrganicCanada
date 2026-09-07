const { init } = require('@medusajs/framework');
const path = require('path');

async function main() {
  const medusa = await init(path.join(__dirname, '..'), {});
  const container = medusa.container;
  const query = container.resolve("query");

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "shipping_address.*", "type"]
    });
    console.log("Orders:", JSON.stringify(orders, null, 2));

    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "location_id"]
    });
    console.log("Fulfillments:", JSON.stringify(fulfillments, null, 2));

    if (fulfillments && fulfillments.length > 0 && fulfillments[0].location_id) {
      const { data: stock_locations } = await query.graph({
        entity: "stock_location",
        fields: ["id", "address.*"],
        filters: { id: fulfillments[0].location_id }
      });
      console.log("Stock Locations:", JSON.stringify(stock_locations, null, 2));
    }
  } catch (e) {
    console.error("Query Error:", e);
  }
  process.exit(0);
}
main();
