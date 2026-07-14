import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { cart_id } = req.body as any
  const query = req.scope.resolve("query")
  const orderModule = req.scope.resolve(Modules.ORDER)

  try {
    if (!cart_id) {
      return res.status(400).json({ message: "Cart ID is required to generate a quote." })
    }

    // 1. Fetch the full Cart from the database
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id", "email", "currency_code", "region_id", "customer_id",
        "items.*", "shipping_address.*", "billing_address.*"
      ],
      filters: { id: cart_id }
    })

    if (!carts || carts.length === 0) {
      return res.status(404).json({ message: "Cart not found." })
    }

    const cart = carts[0]

    // --- IDOR CHECK: Verify the cart belongs to the authenticated customer ---
    if (cart.customer_id !== callerId) {
      return res.status(403).json({ message: "Forbidden" })
    }

    // 2. Format the Cart items for the Draft Order
    const draftItems = (cart.items || []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_id: item.product_id,
      variant_id: item.variant_id,
    }))

    // 3. 🟢 Create the Draft Order and flag it as a B2B Quote!
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
        is_b2b_quote: true, // This is what your Admin UI looks for!
        original_cart_id: cart.id
      }
    } as any)

    const draftOrderId = Array.isArray(draftOrder) ? draftOrder[0]?.id : (draftOrder as any).id
    console.log(`🧾 🎉 B2B Net-30 Quote Generated: ${draftOrderId}`)

    // 4. Return success so the Next.js Storefront can redirect to the Success Page
    res.status(200).json({ success: true, draft_order_id: draftOrderId })

  } catch (error: any) {
    console.error("❌ Failed to generate B2B Quote:", error.message)
    res.status(500).json({ message: "Internal Server Error generating quote." })
  }
}