import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  listPickupLocationsWorkflow,
  createPickupFulfillmentWorkflow,
  markOrderPickedUpWorkflow,
} from "../../../workflows/pickup-location"

// ─── GET /store/pickup/locations ──────────────────────────────────
// Returns pickup-enabled locations for the storefront checkout UI
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { result } = await listPickupLocationsWorkflow(req.scope).run({
      input: { region_id: req.query.region_id as string },
    })

    const formatted = result.pickupLocations.map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address
        ? [loc.address.address_1, loc.address.city, loc.address.province]
            .filter(Boolean)
            .join(", ")
        : "Address not available",
      hours: loc.metadata?.hours || "Mon–Fri 9am–6pm",
      phone: loc.metadata?.phone || "",
    }))

    return res.json({ pickup_locations: formatted })
  } catch (err: any) {
    console.error("[PICKUP GET] Error:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// ─── POST /store/pickup/fulfill ───────────────────────────────────
// Body: { order_id, location_id, items[], pickup_date?, customer_name? }
// Called after checkout when customer selects pickup
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id, location_id, items, pickup_date, customer_name } =
    req.body as any

  if (!order_id || !location_id || !items?.length) {
    return res.status(400).json({
      error: "order_id, location_id, and items[] are required",
    })
  }

  try {
    const { result } = await createPickupFulfillmentWorkflow(req.scope).run({
      input: {
        orderId: order_id,
        locationId: location_id,
        items,
        pickup_date,
        customer_name,
      },
    })

    return res.status(201).json({
      message: "Pickup fulfillment created",
      fulfillment: result.fulfillment,
    })
  } catch (err: any) {
    console.error("[PICKUP POST] Error:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// ─── PATCH /store/pickup/collect ─────────────────────────────────
// Body: { order_id, collected_by? }
// Called by POS staff when handing the package to the customer
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { order_id, collected_by } = req.body as any

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required" })
  }

  try {
    await markOrderPickedUpWorkflow(req.scope).run({
      input: { orderId: order_id, collected_by },
    })
    return res.json({ message: "Order marked as collected", order_id })
  } catch (err: any) {
    console.error("[PICKUP PATCH] Error:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}