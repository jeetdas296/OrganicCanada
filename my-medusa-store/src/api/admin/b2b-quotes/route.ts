// src/api/admin/b2b-quotes/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    customer_id,
    limit = "20",
    offset = "0",
  } = req.query as Record<string, string>

  const filters: Record<string, unknown> = {
    metadata: { is_b2b_quote: true },
  }

  if (customer_id) {
    filters.customer_id = customer_id
  }

  const { data: quotes } = await query.graph({
    entity: "order",
    fields: [
      "id", "email", "currency_code", "total", "subtotal", "status",
      "created_at", "items.*", "metadata", "customer_id",
    ],
    filters,
    pagination: {
      skip: Number(offset),
      take: Number(limit),
      order: { created_at: "DESC" },
    },
  })

  return res.json({
    quotes,
    count: quotes.length,
    limit: Number(limit),
    offset: Number(offset),
  })
}