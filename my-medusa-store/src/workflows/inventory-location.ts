import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// ─── STEP 1: Get Inventory Levels ─────────────────────────────────
export const getInventoryLevelsStep = createStep(
  "get-inventory-levels-step",
  async (
    input: { inventory_item_id?: string; location_ids?: string[] },
    { container }
  ) => {
    const inventoryService = container.resolve(Modules.INVENTORY)
    const filters: Record<string, any> = {}
    if (input.inventory_item_id)
      filters.inventory_item_id = input.inventory_item_id
    if (input.location_ids) filters.location_id = input.location_ids

    const levels = await inventoryService.listInventoryLevels(filters, {
      relations: ["inventory_item"],
    })

    console.log("[INVENTORY] Fetched " + levels.length + " level record(s)")
    return new StepResponse({ levels })
  }
)

// ─── STEP 2: Transfer Stock Between Locations ─────────────────────
export const transferStockStep = createStep(
  "transfer-stock-step",
  async (
    input: {
      inventory_item_id: string
      from_location_id: string
      to_location_id: string
      quantity: number
    },
    { container }
  ) => {
    const inventoryService = container.resolve(Modules.INVENTORY)

    // Deduct from source
    await inventoryService.adjustInventory(
      input.inventory_item_id,
      input.from_location_id,
      -input.quantity
    )

    // Add to destination
    await inventoryService.adjustInventory(
      input.inventory_item_id,
      input.to_location_id,
      input.quantity
    )

    console.log(
      "[INVENTORY] Transferred " + input.quantity +
      " units from " + input.from_location_id +
      " to " + input.to_location_id
    )

    return new StepResponse({
      transferred: true,
      inventory_item_id: input.inventory_item_id,
      quantity: input.quantity,
      from_location_id: input.from_location_id,
      to_location_id: input.to_location_id,
    })
  },
  // Rollback: reverse the transfer
  async (data: any, { container }) => {
    if (!data) return
    const inventoryService = container.resolve(Modules.INVENTORY)
    await inventoryService.adjustInventory(
      data.inventory_item_id,
      data.to_location_id,
      -data.quantity
    )
    await inventoryService.adjustInventory(
      data.inventory_item_id,
      data.from_location_id,
      data.quantity
    )
  }
)

// ─── STEP 3: Check Channel Availability ───────────────────────────
export const checkChannelAvailabilityStep = createStep(
  "check-channel-availability-step",
  async (
    input: {
      sales_channel_id: string
      items: Array<{ variant_id: string; quantity: number }>
    },
    { container }
  ) => {
    const query = container.resolve("query")
    const inventoryService = container.resolve(Modules.INVENTORY)

    const { data: channels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name", "stock_locations.*"],
      filters: { id: input.sales_channel_id },
    })

    const locationIds =
      channels[0]?.stock_locations?.map((l: any) => l.id) || []

    if (locationIds.length === 0) {
      console.warn("[INVENTORY] No locations linked to channel " + input.sales_channel_id)
      return new StepResponse({ available: true, unavailable_items: [] })
    }

    const unavailableItems: Array<{
      variant_id: string
      requested: number
      available: number
    }> = []

    for (const item of input.items) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.*"],
        filters: { id: item.variant_id },
      })

      const inventoryItemId =
        variants[0]?.inventory_items?.[0]?.inventory_item_id
      if (!inventoryItemId) continue

      const levels = await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: locationIds,
      })

      const totalAvailable = levels.reduce(
        (sum: number, lvl: any) =>
          sum + ((lvl.stocked_quantity || 0) - (lvl.reserved_quantity || 0)),
        0
      )

      if (totalAvailable < item.quantity) {
        unavailableItems.push({
          variant_id: item.variant_id,
          requested: item.quantity,
          available: totalAvailable,
        })
      }
    }

    const available = unavailableItems.length === 0
    return new StepResponse({ available, unavailable_items: unavailableItems })
  }
)

// ─── WORKFLOW A: Inventory Summary ────────────────────────────────
export const getInventorySummaryWorkflow = createWorkflow(
  "get-inventory-summary",
  (input: { inventory_item_id?: string; location_ids?: string[] }) => {
    const { levels } = getInventoryLevelsStep(input)
    return new WorkflowResponse({ levels })
  }
)

// ─── WORKFLOW B: Transfer Stock ───────────────────────────────────
export const transferStockWorkflow = createWorkflow(
  "transfer-stock",
  (input: {
    inventory_item_id: string
    from_location_id: string
    to_location_id: string
    quantity: number
  }) => {
    const result = transferStockStep(input)
    return new WorkflowResponse(result)
  }
)

// ─── WORKFLOW C: Check Channel Availability ───────────────────────
export const checkChannelAvailabilityWorkflow = createWorkflow(
  "check-channel-availability",
  (input: {
    sales_channel_id: string
    items: Array<{ variant_id: string; quantity: number }>
  }) => {
    const result = checkChannelAvailabilityStep(input)
    return new WorkflowResponse(result)
  }
)