import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// ─── STEP 1: Resolve POS Sales Channel + Linked Location ──────────
const resolvePOSContextStep = createStep(
  "resolve-pos-context-step",
  async (input: { store_location_name?: string }, { container }) => {
    const query = container.resolve("query")

    const channelName = input.store_location_name
      ? `POS - ${input.store_location_name}`
      : "POS"

    const { data: channels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { name: channelName },
    })

    const posChannel = channels[0]
    if (!posChannel) {
      throw new Error(
        "POS Sales Channel not found. Create one named 'POS' in Admin > Settings > Sales Channels."
      )
    }

    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "sales_channels.*"],
    })

    const posLocation = locations.find((loc: any) =>
      loc.sales_channels?.some((sc: any) => sc.id === posChannel.id)
    )

    console.log(
      "[POS] Channel: " + posChannel.id +
      " | Location: " + (posLocation?.id || "NONE")
    )

    return new StepResponse({
      salesChannelId: posChannel.id,
      locationId: posLocation?.id || null,
    })
  }
)

// ─── STEP 2: Create the POS Draft Order (EUR Currency) ────────────
const createPOSOrderStep = createStep(
  "create-pos-order-step",
  async (
    input: {
      currency_code: string
      items: Array<{
        variant_id: string
        quantity: number
        unit_price: number
        title: string
      }>
      customer_id?: string
      sales_channel_id: string
      location_id?: string | null
      payment_method?: "cash" | "card" | "mobilepay" | "gift_card"  // ← Added MobilePay for DK
      pos_terminal_id?: string
    },
    { container }
  ) => {
    const orderService = container.resolve(Modules.ORDER)

    const posOrder = await orderService.createOrders({
      currency_code: input.currency_code,
      status: "draft",
      customer_id: input.customer_id,
      sales_channel_id: input.sales_channel_id,
      metadata: {
        source: "pos",
        pos_terminal_id: input.pos_terminal_id || "copenhagen-store",  // ← Default terminal
        payment_method: input.payment_method || "card",
        stock_location_id: input.location_id,
      },
      items: input.items.map((i) => ({
        title: i.title,
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      shipping_methods: [],
    })

    console.log("[POS] Draft order created: " + posOrder.id)
    return new StepResponse({ posOrder }, posOrder.id)
  },
  async (orderId, { container }) => {
    if (!orderId) return
    const orderService = container.resolve(Modules.ORDER)
    await orderService.deleteOrders([orderId])
  }
)

// ─── STEP 3: Reserve Inventory at POS Location ────────────────────
const reservePOSInventoryStep = createStep(
  "reserve-pos-inventory-step",
  async (
    input: {
      items: Array<{ variant_id: string; quantity: number }>
      locationId: string | null
    },
    { container }
  ) => {
    if (!input.locationId) {
      console.warn("[POS] No location ID — skipping inventory reservation")
      return new StepResponse({ reserved: false })
    }

    const query = container.resolve("query")
    const inventoryService = container.resolve(Modules.INVENTORY)

    for (const item of input.items) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.*"],
        filters: { id: item.variant_id },
      })

      const inventoryItemId =
        variants[0]?.inventory_items?.[0]?.inventory_item_id

      if (inventoryItemId) {
        try {
          await inventoryService.createReservationItems([
            {
              inventory_item_id: inventoryItemId,
              location_id: input.locationId,
              quantity: item.quantity,
            },
          ])
          console.log(
            "[POS] Reserved " + item.quantity + "x " + inventoryItemId
          )
        } catch (err: any) {
          console.warn("[POS] Reserve failed: " + err.message)
        }
      }
    }

    return new StepResponse({ reserved: true })
  }
)

// ─── WORKFLOW: Full POS Order Creation (EUR Default) ──────────────
export const createPOSOrderWorkflow = createWorkflow(
  "create-pos-order",
  (input: {
    currency_code?: string  // ← Made optional
    items: Array<{
      variant_id: string
      quantity: number
      unit_price: number
      title: string
    }>
    customer_id?: string
    store_location_name?: string
    payment_method?: "cash" | "card" | "mobilepay" | "gift_card"
    pos_terminal_id?: string
  }) => {
    const { salesChannelId, locationId } = resolvePOSContextStep({
      store_location_name: input.store_location_name,
    })

    const { posOrder } = createPOSOrderStep({
      currency_code: input.currency_code || "eur",  // ← Default to EUR
      items: input.items,
      customer_id: input.customer_id,
      sales_channel_id: salesChannelId,
      location_id: locationId,
      payment_method: input.payment_method,
      pos_terminal_id: input.pos_terminal_id,
    })

    reservePOSInventoryStep({
      items: input.items,
      locationId: locationId,
    })

    return new WorkflowResponse({ posOrder, salesChannelId, locationId })
  }
)