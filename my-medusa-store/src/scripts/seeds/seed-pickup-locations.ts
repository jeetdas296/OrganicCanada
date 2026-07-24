import { ExecArgs } from "@medusajs/framework/types";
import { createStockLocationsWorkflow } from "@medusajs/medusa/core-flows";

export async function seedPickupLocations({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const query = container.resolve("query");

  logger.info("Checking for existing Stock Locations...");
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  const hasPickupLocation = stockLocations.some((loc: any) => loc.name === "Downtown Store Pickup");

  if (!hasPickupLocation) {
    logger.info("Seeding custom Pickup Locations...");
    await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Downtown Store Pickup",
            address: {
              address_1: "123 Organic St",
              city: "Toronto",
              country_code: "CA",
              postal_code: "M5V 2H1",
            },
          },
          {
            name: "Farm Direct Pickup",
            address: {
              address_1: "456 Farm Road",
              city: "Markham",
              country_code: "CA",
              postal_code: "L3R 9W3",
            },
          }
        ],
      },
    });
    logger.info("✓ Pickup Locations seeded");
  } else {
    logger.info("✓ Pickup Locations already seeded, skipping.");
  }
}
