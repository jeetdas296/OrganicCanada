import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// ─── STEP 1: Fetch Pickup-Enabled Locations ───────────────────────
export const fetchPickupLocationsStep = createStep(
  "fetch-pickup-locations-step",
  async (_input: { region_id?: string }, { container }) => {
    const query = container.resolve("query")

    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "address.*", "metadata"],
    })

    // Only locations with metadata.is_pickup === "true" or true
    const pickupLocations = locations.filter(
      (loc: any) =>
        loc.metadata?.is_pickup === true ||
        loc.metadata?.is_pickup === "true"
    )

    console.log("[PICKUP] Found " + pickupLocations.length + " pickup location(s)")
    return new StepResponse({ pickupLocations })
  }
)

// ─── STEP 2: Create Pickup Fulfillment ────────────────────────────
export const createPickupFulfillmentStep = createStep(
  "create-pickup-fulfillment-step",
  async (
    input: {
      orderId: string
      locationId: string
      items: Array<{ item_id: string; quantity: number }>
      pickup_date?: string
      customer_name?: string
    },
    { container }
  ) => {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    const orderService = container.resolve(Modules.ORDER)

    const fulfillment = await fulfillmentService.createFulfillment({
      location_id: input.locationId,
      items: input.items,
      order_id: input.orderId,
      provider_id: "manual",
      delivery_address: {},
      labels: [],
      order: { id: input.orderId } as any,
      metadata: {
        type: "pickup",
        pickup_date: input.pickup_date,
        customer_name: input.customer_name,
      },
    })

    // Tag the order with pickup info
    await orderService.updateOrders([
      {
        id: input.orderId,
        metadata: {
          fulfillment_type: "pickup",
          pickup_location_id: input.locationId,
          pickup_fulfillment_id: fulfillment.id,
          pickup_date: input.pickup_date,
          pickup_status: "ready_for_pickup",
        },
      },
    ])

    console.log("[PICKUP] Fulfillment " + fulfillment.id + " created")
    return new StepResponse({ fulfillment }, fulfillment.id)
  },
  async (fulfillmentId, { container }) => {
    if (!fulfillmentId) return
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    await fulfillmentService.cancelFulfillment(fulfillmentId)
  }
)

// ─── STEP 3: Mark Order as Collected ─────────────────────────────
export const markPickedUpStep = createStep(
  "mark-picked-up-step",
  async (
    input: { orderId: string; collected_by?: string },
    { container }
  ) => {
    const orderService = container.resolve(Modules.ORDER)

    await orderService.updateOrders([
      {
        id: input.orderId,
        metadata: {
          pickup_status: "collected",
          collected_at: new Date().toISOString(),
          collected_by: input.collected_by || "customer",
        },
      },
    ])

    console.log("[PICKUP] Order " + input.orderId + " marked as collected")
    return new StepResponse({ collected: true })
  }
)

// ─── WORKFLOW A: List Available Pickup Locations ──────────────────
export const listPickupLocationsWorkflow = createWorkflow(
  "list-pickup-locations",
  (input: { region_id?: string }) => {
    const { pickupLocations } = fetchPickupLocationsStep(input)
    return new WorkflowResponse({ pickupLocations })
  }
)

// ─── WORKFLOW B: Create Pickup Fulfillment ────────────────────────
export const createPickupFulfillmentWorkflow = createWorkflow(
  "create-pickup-fulfillment",
  (input: {
    orderId: string
    locationId: string
    items: Array<{ item_id: string; quantity: number }>
    pickup_date?: string
    customer_name?: string
  }) => {
    const { fulfillment } = createPickupFulfillmentStep(input)
    return new WorkflowResponse({ fulfillment })
  }
)

// ─── WORKFLOW C: Mark Order as Collected ─────────────────────────
export const markOrderPickedUpWorkflow = createWorkflow(
  "mark-order-picked-up",
  (input: { orderId: string; collected_by?: string }) => {
    const result = markPickedUpStep(input)
    return new WorkflowResponse(result)
  }
)