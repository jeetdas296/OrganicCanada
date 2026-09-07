import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = req.params.id

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" })
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

  // 2. Fetch Order with Items and Fulfillments
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "items.*",
      "items.detail.*",
      "fulfillments.*",
      "fulfillments.items.*"
    ],
    filters: { id: orderId }
  })

  const order = orders[0]
  if (!order) {
    return res.status(404).json({ message: "Order not found" })
  }

  const orderItems = order.items || []

  // 3. Map Order Items to Vendors
  const variantIds = orderItems.map((item: any) => item?.variant_id).filter(Boolean)
  const productVendorMap = new Map<string, any>()

  if (variantIds.length > 0) {
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "product.id", "product.vendor.*"],
      filters: { id: variantIds }
    })

    for (const v of variants) {
      if (v.product?.vendor?.id) {
        productVendorMap.set(v.id, v.product.vendor)
      }
    }
  }

  // 4. Calculate Eligibility
  const eligibleItems: any[] = []
  
  for (const item of orderItems) {
    if (!item) continue
    
    const itemVendor = productVendorMap.get(item.variant_id as string)
    const itemVendorId = itemVendor?.id || "platform_direct"

    // Only allow Admin or the exact Vendor to fulfill this item
    if (activeVendorId && activeVendorId !== itemVendorId) {
      continue
    }

    // Calculate remaining quantity
    const fulfilledQty = Number(item.detail?.fulfilled_quantity || 0)
    const totalQty = Number(item.quantity || 0)
    const remainingQty = totalQty - fulfilledQty

    if (remainingQty > 0) {
      eligibleItems.push({
        item_id: item.id,
        title: item.title,
        variant_id: item.variant_id,
        quantity: totalQty,
        fulfilled_quantity: fulfilledQty,
        remaining_quantity: remainingQty,
        vendor: itemVendor || { id: "platform_direct", name: "Main Warehouse" }
      })
    }
  }

  // 5. Fetch PAL Shipments for display
  let palShipments: any[] = []
  try {
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: ["id", "status", "transport_mode", "trade_type", "selected_provider_id", "external_reference", "vendor_id", "bookings.*"],
      filters: { order_id: orderId }
    })
    palShipments = shipments
  } catch (err) {
    console.warn("Failed to fetch PAL shipments:", err)
  }

  return res.json({
    order_id: order.id,
    display_id: order.display_id,
    is_vendor: !!activeVendorId,
    active_vendor_id: activeVendorId,
    eligible_items: eligibleItems,
    pal_shipments: palShipments
  })
}
