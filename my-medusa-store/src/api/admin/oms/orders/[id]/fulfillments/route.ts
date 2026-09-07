import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { fulfillOrderWorkflow } from "../../../../../../workflows/order-management"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = req.params.id
  const body = req.body as any

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" })
  }

  const requestedItems = body.items as Array<{ item_id: string; quantity: number }>
  if (!requestedItems || requestedItems.length === 0) {
    return res.status(400).json({ message: "No items provided for fulfillment" })
  }

  const fulfillmentMethod = body.fulfillment_method || "organic_canada"
  const providerId = fulfillmentMethod === "manual" 
    ? "manual_manual" 
    : "organic_canada_organic_canada"

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
      "items.*",
      "items.detail.*",
      "items.variant.id",
      "items.variant.sku",
      "items.variant.barcode",
      "items.variant.product.id",
      "items.variant.product.vendor.*",
      "items.variant.inventory_items.*"
    ],
    filters: { id: orderId }
  })

  const order = orders[0]
  if (!order) {
    return res.status(404).json({ message: "Order not found" })
  }

  const orderItems = order.items || []
  
  // 3. Map Order Items to Vendors
  const productVendorMap = new Map<string, any>()
  for (const item of orderItems) {
    if (item && item.variant?.product?.vendor?.id) {
      productVendorMap.set(item.variant.id, item.variant.product.vendor)
    }
  }

  // 4. Validate Requested Items and Construct Medusa Workflow Payload
  const workflowItems: Array<any> = []

  for (const reqItem of requestedItems) {
    const orderItem = orderItems.find((i: any) => i?.id === reqItem.item_id)
    if (!orderItem) {
      return res.status(400).json({ message: `Item ${reqItem.item_id} not found in order` })
    }

    const itemVendor = productVendorMap.get(orderItem.variant_id as string)
    const itemVendorId = itemVendor?.id || "platform_direct"

    // Only allow Admin or the exact Vendor to fulfill this item
    if (activeVendorId && activeVendorId !== itemVendorId) {
      return res.status(403).json({ message: `You are not authorized to fulfill item ${reqItem.item_id}` })
    }

    const fulfilledQty = Number(orderItem.detail?.fulfilled_quantity || 0)
    const totalQty = Number(orderItem.quantity || 0)
    const remainingQty = totalQty - fulfilledQty

    if (reqItem.quantity > remainingQty) {
      return res.status(400).json({ message: `Requested quantity for ${reqItem.item_id} exceeds remaining fulfillable quantity` })
    }

    const inventoryItemId = orderItem.variant?.inventory_items?.[0]?.inventory_item_id || null

    workflowItems.push({
      id: orderItem.id, // Medusa expects the line item ID as `id` or `item_id` in some workflows, passing both to be safe
      item_id: orderItem.id, 
      line_item_id: orderItem.id,
      inventory_item_id: inventoryItemId,
      title: orderItem.title,
      sku: orderItem.variant?.sku || "",
      barcode: orderItem.variant?.barcode || "",
      quantity: reqItem.quantity
    })
  }

  // 5. Location Resolution
  let resolvedLocationId = ""
  if (activeVendorId) {
    // Attempt to resolve vendor's authorized location via pal_vendor_location
    try {
      const { data: locations } = await query.graph({
        entity: "pal_vendor_location",
        fields: ["id"],
        filters: { vendor_id: activeVendorId, enabled: true }
      })
      if (locations && locations.length > 0) {
        // Assume the pal_vendor_location ID is mapped or valid as Medusa stock location id
        // (In a full production scenario this might require joining against Medusa stock_locations)
        resolvedLocationId = locations[0].id
      }
    } catch (e) {
      console.warn("Failed to fetch vendor location", e)
    }
  }

  // 6. Execute Medusa Fulfillment via Workflow
  try {
    console.log("[OMS_TO_MEDUSA]", {
      source: "OMS",
      fulfillment_method: fulfillmentMethod,
      medusa_provider_id: providerId,
      pal_provider_id: "organic_canada"
    })

    const { result } = await fulfillOrderWorkflow(req.scope).run({
      input: {
        orderId,
        locationId: resolvedLocationId, // Empty string falls back to order sales channel location
        items: workflowItems,
        providerId
      }
    })

    return res.json({ fulfillment: result.fulfillment })
  } catch (error: any) {
    console.error("[OMS Fulfillment Error]", error)
    return res.status(500).json({ message: error.message || "Failed to create fulfillment" })
  }
}
