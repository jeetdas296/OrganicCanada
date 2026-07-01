import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function erpInventoryUpdateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ inventory_item_id: string }>) {
  const erpModuleService = container.resolve("erp")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  logger.info(`[ERPNext Subscriber] Inventory level update detected for item: ${data.inventory_item_id}. Fetching levels...`)
  
  try {
    // 1. Fetch inventory item details
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku", "title"],
      filters: { id: data.inventory_item_id }
    })

    const inventoryItem = inventoryItems[0]
    if (!inventoryItem) {
      logger.error(`[ERPNext Subscriber] Inventory item ${data.inventory_item_id} not found.`)
      return
    }

    if (!inventoryItem.sku) {
      logger.warn(`[ERPNext Subscriber] Inventory item ${data.inventory_item_id} does not have a SKU. Skipping sync.`)
      return
    }

    // 2. Fetch inventory levels
    const { data: levels } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "stocked_quantity"],
      filters: { inventory_item_id: data.inventory_item_id }
    })

    const totalQty = levels.reduce((sum: number, lvl: any) => sum + (lvl.stocked_quantity || 0), 0)

    await erpModuleService.syncInventory(data.inventory_item_id, inventoryItem.sku, totalQty)
    logger.info(`[ERPNext Subscriber] Inventory item ${data.inventory_item_id} (SKU: ${inventoryItem.sku}) successfully synced to ERPNext.`)
  } catch (error: any) {
    logger.error(`[ERPNext Subscriber] Failed to sync inventory item ${data.inventory_item_id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "inventory-level.updated",
}
