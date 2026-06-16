import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// ─── STEP 1: Create a Draft Order (used by POS & admin) ───────────
export const createDraftOrderStep = createStep(
  "create-draft-order-step",
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
      sales_channel_id?: string
      shipping_address?: Record<string, string>
    },
    { container }
  ) => {
    const orderService = container.resolve(Modules.ORDER)

    const draftOrder = await orderService.createOrders({
      currency_code: input.currency_code,
      status: "draft",
      customer_id: input.customer_id,
      sales_channel_id: input.sales_channel_id,
      shipping_address: input.shipping_address,
      items: input.items.map((i) => ({
        title: i.title,
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      shipping_methods: [],
    })

    console.log("OMS: Draft order created: " + draftOrder.id)
    return new StepResponse({ draftOrder }, draftOrder.id)
  },
  async (draftOrderId, { container }) => {
    if (!draftOrderId) return
    const orderService = container.resolve(Modules.ORDER)
    await orderService.deleteOrders([draftOrderId])
  }
)

// ─── STEP 2: Route to Fulfillment Provider ────────────────────────
export const routeFulfillmentStep = createStep(
  "route-fulfillment-step",
  async (
    input: {
      orderId: string
      locationId: string
      items: Array<{ item_id: string; quantity: number }>
    },
    { container }
  ) => {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)

    const fulfillment = await fulfillmentService.createFulfillment({
      location_id: input.locationId,
      items: input.items,
      order_id: input.orderId,
      provider_id: "manual", // swap with your provider ID e.g. "shipstation"
      delivery_address: {},
      labels: [],
      order: { id: input.orderId } as any,
    })

    console.log("OMS: Fulfillment created: " + fulfillment.id)
    return new StepResponse({ fulfillment }, fulfillment.id)
  },
  async (fulfillmentId, { container }) => {
    if (!fulfillmentId) return
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    await fulfillmentService.cancelFulfillment(fulfillmentId)
  }
)

// ─── STEP 3: Create Return ────────────────────────────────────────
export const createReturnStep = createStep(
  "create-return-step",
  async (
    input: {
      orderId: string
      items: Array<{ item_id: string; quantity: number; reason_id?: string }>
      locationId?: string
    },
    { container }
  ) => {
    const orderService = container.resolve(Modules.ORDER)

    const orderReturn = await orderService.createReturns({
      order_id: input.orderId,
      items: input.items,
      location_id: input.locationId,
    })

    console.log("OMS: Return created: " + orderReturn.id)
    return new StepResponse({ orderReturn }, orderReturn.id)
  },
  async (returnId, { container }) => {
    if (!returnId) return
    const orderService = container.resolve(Modules.ORDER)
    await orderService.deleteReturns([returnId])
  }
)

// ─── WORKFLOW A: Create Draft Order ──────────────────────────────
export const createDraftOrderWorkflow = createWorkflow(
  "create-draft-order",
  (input: {
    currency_code: string
    items: Array<{
      variant_id: string
      quantity: number
      unit_price: number
      title: string
    }>
    customer_id?: string
    sales_channel_id?: string
    shipping_address?: Record<string, string>
  }) => {
    const { draftOrder } = createDraftOrderStep(input)
    return new WorkflowResponse({ draftOrder })
  }
)

// ─── WORKFLOW B: Fulfill Order ────────────────────────────────────
export const fulfillOrderWorkflow = createWorkflow(
  "fulfill-order",
  (input: {
    orderId: string
    locationId: string
    items: Array<{ item_id: string; quantity: number }>
  }) => {
    const { fulfillment } = routeFulfillmentStep(input)
    return new WorkflowResponse({ fulfillment })
  }
)

// ─── WORKFLOW C: Process Return ───────────────────────────────────
export const processReturnWorkflow = createWorkflow(
  "process-return",
  (input: {
    orderId: string
    items: Array<{ item_id: string; quantity: number; reason_id?: string }>
    locationId?: string
  }) => {
    const { orderReturn } = createReturnStep(input)
    return new WorkflowResponse({ orderReturn })
  }
)