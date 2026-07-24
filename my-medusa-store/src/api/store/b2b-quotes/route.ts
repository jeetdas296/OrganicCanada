import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")

  try {
    const { data: quotes } = await query.graph({
      entity: "order",
      fields: [
        "id", "email", "currency_code", "total", "subtotal", "created_at", "status",
        "items.*", "metadata", "customer_id"
      ],
      filters: {
        customer_id: callerId,
      }
    })

    // Filter down to only those that are B2B quotes and draft orders (or pending)
    const b2bQuotes = quotes.filter((q: any) => q.metadata?.is_b2b_quote === true)

    return res.status(200).json({ quotes: b2bQuotes })
  } catch (error: any) {
    return res.status(500).json({ message: "Internal Server Error fetching quotes." })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { cart_id, payment_term } = req.body as any
  const query = req.scope.resolve("query")
  const orderModule = req.scope.resolve(Modules.ORDER)

  try {
    if (!cart_id) {
      return res.status(400).json({ message: "Cart ID is required to generate a quote." })
    }

    // 🟢 1. Query the cart including sales_channel_id & metadata fields
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id", "email", "currency_code", "region_id", "customer_id", "sales_channel_id", "metadata",
        "items.*", "shipping_address.*", "billing_address.*"
      ],
      filters: { id: cart_id }
    })

    if (!carts || carts.length === 0) {
      return res.status(404).json({ message: "Cart not found." })
    }

    const cart = carts[0]

    if (cart.customer_id !== callerId) {
      return res.status(403).json({ message: "Forbidden" })
    }

    // 🟢 2. Resolve selected payment term (from req.body first, then cart metadata, fallback to net_30)
    const selectedPaymentTerm =
      payment_term ||
      (typeof cart.metadata?.payment_term === "string" ? cart.metadata.payment_term : null) ||
      "net_30"

    const draftItems = (cart.items || []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_id: item.product_id,
      variant_id: item.variant_id,
    }))

    // 🟢 3. Merge existing metadata and explicitly save payment_term onto the created order
    const draftOrder = await orderModule.createOrders({
      is_draft_order: true,
      email: cart.email || "b2b-partner@quote.com",
      customer_id: cart.customer_id,
      currency_code: cart.currency_code,
      region_id: cart.region_id,
      shipping_address: cart.shipping_address,
      billing_address: cart.billing_address,
      items: draftItems,
      sales_channel_id: cart.sales_channel_id,
      metadata: {
        ...(cart.metadata || {}),
        is_b2b_quote: true,
        original_cart_id: cart.id,
        payment_term: selectedPaymentTerm,
        is_b2b: true,
      }
    } as any)

    console.log("Draft Order:", draftOrder)

    const draftOrderId = Array.isArray(draftOrder) ? draftOrder[0]?.id : (draftOrder as any).id
    console.log(`🧾 🎉 Quote Generated: ${draftOrderId}`)

    res.status(200).json({ success: true, draft_order_id: draftOrderId })

  } catch (error: any) {
    console.error("❌ Failed to generate B2B Quote:", error.message)
    res.status(500).json({ message: "Internal Server Error generating quote." })
  }
}