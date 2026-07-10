// src/api/admin/b2b-quotes/[id]/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { B2B_MODULE } from "../../../../modules/b2b"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const b2bService = req.scope.resolve(B2B_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const [quote] = await b2bService.listQuotes({ id: [id] })

  if (!quote) {
    return res.status(404).json({ message: "Quote not found" })
  }

  // Fetch cart details
  let cart: any = null
  if (quote.cart_id) {
    const { data: carts } = await query.graph({
      entity: "cart",
      filters: { id: quote.cart_id },
      fields: [
        "id",
        "items.*",
        "customer.*",
        "shipping_address.*",
        "billing_address.*",
        "region.*",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "currency_code",
        "metadata",
      ],
    })
    cart = carts?.[0] || null
  }

  // Fetch order if exists
  let order: any = null
  if (quote.order_id) {
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id: quote.order_id },
      fields: ["id", "status", "total", "created_at", "items.*"],
    })
    order = orders?.[0] || null
  }

  return res.json({ quote: { ...quote, cart, order } })
}