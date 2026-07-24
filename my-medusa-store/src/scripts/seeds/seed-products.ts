import { ExecArgs } from "@medusajs/framework/types";
import { createProductsWorkflow, createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";

export async function seedProducts({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const query = container.resolve("query");

  logger.info("Checking for existing organic products...");
  const [existingProducts, count] = await productModuleService.listAndCountProducts(
    { handle: ["organic-honeycrisp-apples-1-lb", "organic-cherry-tomatoes-pint"] },
    { select: ["id"] }
  );

  if (count === 0) {
    logger.info("Seeding custom Organic Catalog...");
    
    const defaultSalesChannel = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" });
    const channelId = defaultSalesChannel[0]?.id;

    const stockLocations = await stockLocationModuleService.listStockLocations({});
    const locationId = stockLocations[0]?.id;

    const productsToCreate = [
      {
        title: "Organic Honeycrisp Apples (1 lb)",
        handle: "organic-honeycrisp-apples-1-lb",
        description: "Crisp and sweet organic Honeycrisp apples.",
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: "Apple1",
            options: { Default: "Default" },
            prices: [{ amount: 3.5, currency_code: "usd" }, { amount: 3.5, currency_code: "eur" }],
          }
        ],
        sales_channels: channelId ? [{ id: channelId }] : [],
      },
      {
        title: "Organic Cherry Tomatoes (Pint)",
        handle: "organic-cherry-tomatoes-pint",
        description: "Bursting with sweet and tangy flavor. These bite-sized tomatoes are perfect for salads or roasting.",
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: "Tomato2",
            options: { Default: "Default" },
            prices: [{ amount: 3.14, currency_code: "usd" }, { amount: 3.14, currency_code: "eur" }],
          }
        ],
        sales_channels: channelId ? [{ id: channelId }] : [],
      }
    ];

    await createProductsWorkflow(container).run({
      input: { products: productsToCreate }
    });

    if (locationId) {
      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id", "sku"],
      });
      const inventoryLevels = inventoryItems.map((item: any) => ({
        location_id: locationId,
        stocked_quantity: 100,
        inventory_item_id: item.id,
      }));
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: inventoryLevels }
      });
    }

    logger.info("✓ Additional custom products seeded");
  } else {
    logger.info("✓ Custom products already seeded, skipping.");
  }
}
