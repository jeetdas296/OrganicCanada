// src/api/admin/b2b-quotes/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { B2B_MODULE } from "../../../modules/b2b"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const b2bService = req.scope.resolve(B2B_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    status,
    company_id,
    customer_id,
    limit = 20,
    offset = 0,
  } = req.query as Record<string, string>

  const filters: Record<string, unknown> = {}

  if (status) {
    filters.status = status.split(",")
  }
  if (company_id) {
    filters.company_id = company_id
  }
  if (customer_id) {
    filters.customer_id = customer_id
  }

  const [quotes, count] = await b2bService.listAndCountQuotes(filters, {
    skip: Number(offset),
    take: Number(limit),
    order: { created_at: "DESC" },
  })

  // Enrich quotes with cart and order details
  const enrichedQuotes = await Promise.all(
    quotes.map(async (quote) => {
      let cartDetails: any = null
      let orderDetails: any = null

      if (quote.cart_id) {
        try {
          const { data: carts } = await query.graph({
            entity: "cart",
            filters: { id: quote.cart_id },
            fields: [
              "id",
              "items.*",
              "items.product_title",
              "items.variant_title",
              "items.thumbnail",
              "customer.*",
              "shipping_address.*",
              "total",
              "subtotal",
              "currency_code",
              "metadata",
            ],
          })
          cartDetails = carts?.[0] || null
        } catch (e) {
          // Cart may have been completed
        }
      }

      if (quote.order_id) {
        try {
          const { data: orders } = await query.graph({
            entity: "order",
            filters: { id: quote.order_id },
            fields: ["id", "status", "total", "created_at"],
          })
          orderDetails = orders?.[0] || null
        } catch (e) {
          // Order may not exist yet
        }
      }

      return {
        ...quote,
        cart: cartDetails,
        order: orderDetails,
      }
    })
  )

  return res.json({
    quotes: enrichedQuotes,
    count,
    limit: Number(limit),
    offset: Number(offset),
  })
}