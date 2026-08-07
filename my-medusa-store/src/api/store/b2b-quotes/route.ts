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
        "items.*", "items.variant.*", "items.variant.product.*", "items.product.*", "shipping_address.*", "billing_address.*", "shipping_methods.*",
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
      thumbnail: item.thumbnail || item.variant?.product?.thumbnail || item.product?.thumbnail,
      product_title: item.product_title || item.variant?.product?.title || item.product?.title,
      product_description: item.product_description || item.variant?.product?.description || item.product?.description,
      product_subtitle: item.product_subtitle || item.variant?.product?.subtitle || item.product?.subtitle,
      product_type: item.product_type || item.variant?.product?.type?.value || item.product?.type?.value,
      product_collection: item.product_collection || item.variant?.product?.collection?.title || item.product?.collection?.title,
      product_handle: item.product_handle || item.variant?.product?.handle || item.product?.handle,
      variant_sku: item.variant_sku || item.variant?.sku,
      variant_barcode: item.variant_barcode || item.variant?.barcode,
      variant_title: item.variant_title || item.variant?.title,
      metadata: item.metadata,
    }))

    const draftShippingMethods = (cart.shipping_methods || []).map((sm: any) => ({
      name: sm.name,
      amount: sm.amount,
      shipping_option_id: sm.shipping_option_id,
      data: sm.data || {}
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
      shipping_methods: draftShippingMethods,
      items: draftItems,
      sales_channel_id: cart.sales_channel_id,
      metadata: {
        ...(cart.metadata || {}),
        is_b2b_quote: true,
        original_cart_id: cart.id,
        payment_term: selectedPaymentTerm,
        is_b2b: true,
        quote_status: "pending",
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