import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../modules/fulfillment-pal"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  
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

  // 2. Fetch PAL Shipments (without nested relations that are breaking)
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
      "created_at",
      "external_reference"
    ],
    pagination: {
      order: {
        created_at: "DESC",
        id: "DESC"
      }
    }
  })

  const shipmentIds = palShipments.map(s => s.id)

  let bookingsMap = new Map<string, any[]>()
  if (shipmentIds.length > 0) {
    try {
      const { data: bkgs } = await query.graph({
        entity: "pal_provider_booking",
        fields: ["id", "shipment_id", "status", "created_at"],
        filters: { shipment_id: shipmentIds }
      })
      for (const b of bkgs) {
        if (!bookingsMap.has(b.shipment_id)) {
          bookingsMap.set(b.shipment_id, [])
        }
        bookingsMap.get(b.shipment_id)!.push(b)
      }
    } catch (err) {
      console.warn("Could not fetch bookings list", err)
    }
  }

  // 3. For each shipment, fetch associated order to resolve pricing, quantity, and vendors
  // We also need to fetch associated fulfillments to restrict to actual shipment items
  const orderIds = Array.from(new Set(palShipments.map(s => s.order_id).filter(Boolean)))
  const externalRefs = Array.from(new Set(palShipments.map(s => (s as any).external_reference).filter(Boolean)))
  
  let orders: any[] = []
  if (orderIds.length > 0) {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "currency_code",
        "items.*",
        "items.detail.*",
        "items.variant.product.vendor.*"
      ],
      filters: { id: orderIds }
    })
    orders = data
  }

  let fulfillments: any[] = []
  if (externalRefs.length > 0) {
    try {
      const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT) as any
      fulfillments = await fulfillmentModuleService.listFulfillments(
        { id: externalRefs }, 
        { relations: ["items"] }
      )
      
      // DIAGNOSTIC LOGGING
      const testRef = "ful_01M0S52RWSEEYNAW2D6EVGV51"
      if (externalRefs.includes(testRef)) {
        const matchingShipments = palShipments.filter(s => (s as any).external_reference === testRef)
        const fulsFound = fulfillments.filter(f => f.id === testRef)
        const itemsCount = fulsFound.reduce((sum, f) => sum + (f.items?.length || 0), 0)
        const itemIds = fulsFound.flatMap(f => (f.items || []).map((i: any) => i.id))
        const lineItemIds = fulsFound.flatMap(f => (f.items || []).map((i: any) => i.line_item_id))
        
        console.log("=== DIAGNOSTIC LOG ===")
        console.log("PAL shipment(s):", matchingShipments.map(s => s.id).join(", "))
        console.log("external_reference:", testRef)
        console.log("fulfillments found:", fulsFound.length)
        if (fulsFound.length > 0) {
          console.log("fulfillment id:", fulsFound[0].id)
        }
        console.log("fulfillment items:", itemsCount)
        console.log("fulfillment item IDs:", itemIds)
        console.log("line_item_ids:", lineItemIds)
        console.log("======================")
      }
    } catch (err: any) {
      console.error("Failed to fetch fulfillments from FulfillmentModuleService:", err)
      return res.status(500).json({ error: "Failed to retrieve fulfillment data", details: err.message })
    }
  }
  
  const orderMap = new Map(orders.map(o => [o.id, o]))
  const fulfillmentMap = new Map(fulfillments.map(f => [f.id, f]))

  const shipments: any[] = []

  for (const shipment of palShipments) {
    const order = orderMap.get(shipment.order_id)
    if (!order) continue

    const fulfillment = fulfillmentMap.get((shipment as any).external_reference)
    const fulfillmentItemIds = fulfillment?.items?.map((fi: any) => fi.line_item_id || fi.item_id) || []

    const orderItems = order.items || []
    
    // The items actually present in this PAL shipment (based on Medusa fulfillment)
    const shipmentOrderItems = orderItems.filter((i: any) => fulfillmentItemIds.includes(i.id))
    
    // Calculate total quantity and price for this shipment
    // If Admin, they see the whole shipment. If Vendor, they ONLY see their items in this shipment.
    let authorizedItems = shipmentOrderItems
    if (activeVendorId) {
      authorizedItems = shipmentOrderItems.filter((item: any) => {
        const itemVendorId = item?.variant?.product?.vendor?.id || "platform_direct"
        return itemVendorId === activeVendorId
      })
    }
    
    // If a vendor has no items in this shipment, hide the shipment entirely
    if (activeVendorId && authorizedItems.length === 0) {
      continue
    }

    let totalQuantity = 0
    let totalPrice = 0
    let productSummary: any[] = []

    for (const item of authorizedItems) {
      if (!item) continue
      totalQuantity += Number(item.quantity || 0)
      totalPrice += Number(item.unit_price || 0) * Number(item.quantity || 0)
      productSummary.push(item.title)
    }

    const bookings = bookingsMap.get(shipment.id) || []
    const latestBooking = bookings.length > 0 ? bookings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).pop() : null
    const bookingStatus = latestBooking?.status || "NOT_BOOKED"

    const uniqueProducts = Array.from(new Set(productSummary))
    const productStr = uniqueProducts.length > 2 
      ? `${uniqueProducts.slice(0, 2).join(", ")} +${uniqueProducts.length - 2} more` 
      : uniqueProducts.join(", ")

    shipments.push({
      id: shipment.id, // the frontend navigates to /shipping/${shipment.id}
      order_id: shipment.order_id,
      order_type: shipment.order_type,
      trade_type: shipment.trade_type,
      price: totalPrice,
      currency: order.currency_code,
      quantity: totalQuantity,
      products: productStr,
      provider: "organic_canada",
      carrier: (shipment as any).selected_provider_id || null, // PAL capability selected carrier
      transport_mode: shipment.transport_mode || "PARCEL",
      status: shipment.status,
      booking_status: bookingStatus,
      created_at: shipment.created_at
    })
  }

  // Double check sort in memory in case graph pagination order is ignored (sometimes happens in early Medusa v2 modules)
  shipments.sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    if (timeA !== timeB) {
      return timeB - timeA
    }
    return b.id.localeCompare(a.id)
  })

  return res.json({ shipments })
}
