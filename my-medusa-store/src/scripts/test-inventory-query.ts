import { ExecArgs } from "@medusajs/framework/types"

export default async function testInventoryQuery({ container }: ExecArgs) {
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "items.id",
        "items.title",
        "items.variant_id",
        "items.variant.id",
        "items.variant.sku",
        "items.variant.barcode",
        "items.variant.inventory_items.*"
      ]
    })
    
    logger.info("Order Data:")
    console.dir(orders[0], { depth: null })
  } catch (e) {
    logger.error("Failed:", e)
  }
}
