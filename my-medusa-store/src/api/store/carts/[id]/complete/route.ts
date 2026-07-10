// src/api/store/carts/[id]/complete/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { createB2BQuoteWorkflow } from "../../../../../workflows/b2b/create-b2b-quote"

const APPROVAL_REQUIRED_TERMS = ["net_15", "net_30", "net_60", "net_90", "upon_approval"]

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: cartId } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "metadata", "customer_id", "total", "currency_code", "customer.*"],
  })
  console.log("cart:", carts);

  const cart = carts?.[0]
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  const metadata = (cart.metadata as Record<string, any>) || {}

  // Use customer metadata to determine B2B status, falling back to cart metadata
  const is_b2b_customer = cart.customer?.metadata?.b2b_status === "approved"
  const is_b2b = is_b2b_customer || metadata.is_b2b === true || metadata.is_b2b === "true"
  const payment_term = typeof metadata.payment_term === "string" ? metadata.payment_term : null

  const requires_quote =
    is_b2b && payment_term && APPROVAL_REQUIRED_TERMS.includes(payment_term.toLowerCase())

  // ── B2B: Create Quote & Draft (no order) ───────────────────────────────────
  if (requires_quote) {
    try {
      const { result } = await createB2BQuoteWorkflow(req.scope).run({
        input: { cart_id: cartId },
      })

      return res.status(200).json({
        type: "b2b_quote",
        quote: result.quote,
        message:
          "Your order has been submitted for approval. You will be notified once it is reviewed.",
      })
    } catch (e: any) {
      return res.status(500).json({
        message: "Failed to create B2B quote",
        error: e?.message || String(e),
      })
    }
  }

  // ── Normal: Complete cart as usual ─────────────────────────────────────────
  try {
    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cartId },
    })

    return res.status(200).json({
      type: "order",
      order: (result as any).order,
    })
  } catch (e: any) {
    return res.status(500).json({
      message: "Failed to complete cart",
      error: e?.message || String(e),
    })
  }
}