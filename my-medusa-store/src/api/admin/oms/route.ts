import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createDraftOrderWorkflow } from "../../../workflows/order-management"

// ─── POST /admin/oms/draft-orders ─────────────────────────────────
// Creates a draft order from POS terminal or admin desk
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const {
    currency_code = "cad",
    items = [],
    customer_id,
    sales_channel_id,
    shipping_address,
  } = req.body as any

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "items[] is required" })
  }

  try {
    const { result } = await createDraftOrderWorkflow(req.scope).run({
      input: {
        currency_code,
        items,
        customer_id,
        sales_channel_id,
        shipping_address,
      },
    })

    return res.status(201).json({
      message: "Draft order created successfully",
      draft_order: result.draftOrder,
    })
  } catch (err: any) {
    console.error("[OMS ROUTE] Error creating draft order:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// ─── GET /admin/oms/draft-orders ──────────────────────────────────
// Lists all draft orders for admin OMS view
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "currency_code",
        "total",
        "customer_id",
        "items.*",
        "sales_channel_id",
        "created_at",
      ],
      filters: { status: "draft" },
    })

    return res.json({ draft_orders: orders })
  } catch (err: any) {
    console.error("[OMS ROUTE] Error fetching draft orders:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}