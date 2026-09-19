import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../../modules/fulfillment-pal"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  const shipmentId = req.params.shipmentId
  
  if (!shipmentId) {
    return res.status(400).json({ message: "Shipment ID is required" })
  }

  // 1. Resolve logged-in Vendor (if any)
  let activeVendorId: string | null = null
  const authContext = (req as any).auth_context
  const actorId = authContext?.actor_id

  if (actorId) {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: actorId }
    })
    activeVendorId = users[0]?.vendor?.id || null
  }

  console.log("SHIPMENT DETAIL REQUEST", {
    shipmentId,
    actorId,
    actorType: activeVendorId ? "vendor" : "admin"
  })

  // 2. Fetch PAL Shipment
  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "vendor_id",
      "order_type",
      "trade_type",
      "transport_mode",
      "status",
      "selected_provider_id",
      "external_reference"
    ],
    filters: { id: shipmentId }
  })

  const shipment = palShipments[0]
  if (!shipment) {
    console.log("PAL_SHIPMENT_NOT_FOUND", { shipmentId })
    return res.status(404).json({ message: "Shipment not found" })
  }

  // 3. Resolve associated order
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "currency_code",
      "type",
      "items.*",
      "items.detail.*",
      "items.variant.product.vendor.*"
    ],
    filters: { id: shipment.order_id }
  })
  
  const order = orders[0]
  if (!order) {
    return res.status(404).json({ message: "Associated order not found" })
  }

  // Fetch the fulfillment associated with the shipment to find specific items
  let fulfillmentItemIds: string[] = []
  if (shipment.external_reference) {
    try {
      const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT) as any
      const fulfillments = await fulfillmentModuleService.listFulfillments(
        { id: shipment.external_reference }, 
        { relations: ["items"] }
      )
      const fulfillment = fulfillments[0]
      fulfillmentItemIds = fulfillment?.items?.map((fi: any) => fi.line_item_id || fi.item_id) || []
    } catch (err) {
      console.error(`Failed to fetch fulfillment ${shipment.external_reference} from FulfillmentModuleService:`, err)
      // Log appropriately but allow response mapping to continue with empty items
    }
  }

  const orderItems = order.items || []
  
  // The items actually present in this PAL shipment
  const shipmentOrderItems = orderItems.filter((i: any) => fulfillmentItemIds.includes(i.id))
  
  let authorizedItems = shipmentOrderItems

  // Vendor Authorization based on actual item vendors
  if (activeVendorId) {
    authorizedItems = shipmentOrderItems.filter((item: any) => {
      const itemVendorId = item?.variant?.product?.vendor?.id || "platform_direct"
      return itemVendorId === activeVendorId
    })
  }

  // If a vendor has no items in this shipment, block access
  if (activeVendorId && authorizedItems.length === 0) {
    return res.status(403).json({ message: "You are not authorized to view this shipment" })
  }

  let totalQuantity = 0
  let totalPrice = 0
  let productSummary: any[] = []

  for (const item of authorizedItems) {
    if (!item) continue
    totalQuantity += Number(item.quantity || 0)
    totalPrice += Number(item.unit_price || 0) * Number(item.quantity || 0)
    productSummary.push({
      title: item.title,
      quantity: item.quantity,
      price: item.unit_price,
      vendor: item?.variant?.product?.vendor?.name || "Organic Canada"
    })
  }

  // 4. Fetch Packages independently
  let packages: any[] = []
  try {
    const { data: pkgs } = await query.graph({
      entity: "pal_package",
      fields: ["id", "package_type", "weight", "weight_unit", "quantity", "length", "width", "height", "dimension_unit"],
      filters: { shipment_id: shipmentId }
    })
    packages = pkgs
  } catch (err) {
    console.warn("Could not fetch packages", err)
  }

  // 5. Fetch Bookings independently
  let bookings: any[] = []
  try {
    const { data: bkgs } = await query.graph({
      entity: "pal_provider_booking",
      fields: ["id", "status", "external_booking_id", "response_payload", "created_at"],
      filters: { shipment_id: shipmentId }
    })
    bookings = bkgs
  } catch (err) {
    console.warn("Could not fetch bookings", err)
  }

  const latestBooking = bookings.length > 0 ? bookings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).pop() : null
  const bookingStatus = latestBooking?.status || "NOT_BOOKED"

  let timeline: any = null
  const { data: timelines } = await query.graph({
    entity: "pal_shipment_timeline",
    fields: ["id", "scenario", "steps.*"],
    filters: { shipment_id: shipmentId }
  })
  
  if (timelines && timelines.length > 0) {
    timeline = timelines[0]
    if (timeline?.steps) {
      timeline.steps.sort((a: any, b: any) => a.step_order - b.step_order)
    }
  }

  // 7. Stable Payload
  return res.json({
    shipment: {
      id: shipment.id,
      external_reference: shipment.external_reference,
      status: shipment.status,
      trade_type: shipment.trade_type,
      trade_direction: shipment.trade_direction,
      transport_mode: shipment.transport_mode,
      selected_provider_id: shipment.selected_provider_id,
      
      order_id: shipment.order_id,
      order_type: shipment.order_type,
      price: totalPrice,
      currency: order.currency_code,
      quantity: totalQuantity,
      products: productSummary,
      provider: "organic_canada",
      carrier: shipment.selected_provider_id || null, // DHL, FedEx, etc.
      booking_status: bookingStatus,
      booking: latestBooking ? {
        id: latestBooking.id,
        status: latestBooking.status,
        trackingNumber: latestBooking.external_booking_id,
        response_payload: latestBooking.response_payload
      } : null,
      origin: "Toronto, CA", // Usually resolved via addresses
      destination: "New York, US",
      timeline: timeline
    },
    order: {
      id: order.id,
      display_id: order.display_id,
      type: (order as any).type || "default"
    },
    items: productSummary,
    packages: packages,
    provider: {
      id: "organic_canada",
      name: "Organic Canada PAL"
    },
    carrier: {
      id: shipment.selected_provider_id,
      status: "CONFIGURED" // Or NOT_CONFIGURED from provider registry logic
    },
    timeline: timeline
  })
}
