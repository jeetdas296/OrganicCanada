import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createPOSOrderWorkflow } from "../../../workflows/pos-order"

// ─── POST /store/pos/orders (EUR Default) ─────────────────────────
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const {
    currency_code = "eur",  // ← Changed from "cad" to "eur"
    items,
    customer_id,
    store_location_name,
    payment_method = "card",
    pos_terminal_id,
  } = req.body as any

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "items[] is required and must be a non-empty array",
    })
  }

  for (const item of items) {
    if (!item.variant_id || !item.quantity || !item.unit_price || !item.title) {
      return res.status(400).json({
        error: "Each item must have: variant_id, quantity, unit_price, title",
      })
    }
  }

  try {
    const { result } = await createPOSOrderWorkflow(req.scope).run({
      input: {
        currency_code,
        items,
        customer_id,
        store_location_name,
        payment_method,
        pos_terminal_id,
      },
    })

    return res.status(201).json({
      message: "POS order created",
      order: result.posOrder,
      sales_channel_id: result.salesChannelId,
      location_id: result.locationId,
    })
  } catch (err: any) {
    console.error("[POS ROUTE] Error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}

// ─── GET /store/pos/orders?location=Copenhagen ────────────────────
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const location = req.query.location as string | undefined

  try {
    const query = req.scope.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "currency_code",
        "total",
        "items.*",
        "metadata",
        "created_at",
      ],
    })

    // Filter for POS orders
    let filtered = orders.filter(
      (o: any) => o.metadata?.source === "pos"
    )

    if (location) {
      filtered = filtered.filter(
        (o: any) =>
          o.metadata?.pos_terminal_id?.toLowerCase().includes(location.toLowerCase())
      )
    }

    return res.json({ pos_orders: filtered })
  } catch (err: any) {
    console.error("[POS ROUTE] GET error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}