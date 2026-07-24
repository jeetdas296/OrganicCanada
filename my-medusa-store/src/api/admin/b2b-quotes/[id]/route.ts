// src/api/admin/b2b-quotes/[id]/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch the draft order by ID using the graph query
  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id },
    fields: [
      "id", "status", "email", "currency_code", "total", "subtotal",
      "created_at", "customer_id", "metadata",
      "items.*", "items.product_id", "items.variant_id",
      "shipping_address.*", "billing_address.*",
    ],
  })

  const order = orders?.[0]

  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "Quote not found" })
  }

  return res.json({ quote: order })
}