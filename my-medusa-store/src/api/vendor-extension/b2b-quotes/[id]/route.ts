import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

async function getVendorIdForUser(req: MedusaRequest, userId: string): Promise<string | null> {
  const query = req.scope.resolve("query")

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "vendor.*"],
    filters: { id: userId }
  })
  if (users.length > 0 && users[0].vendor?.id) return users[0].vendor.id

  try {
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id"],
      filters: { user_id: userId }
    })
    if (vendors.length > 0 && vendors[0].id) return vendors[0].id
  } catch (e) {}

  return null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const quoteId = req.params.id
    if (!quoteId) return res.status(400).json({ message: "Quote ID required" })

    const query = req.scope.resolve("query")
    const userId = (req as any).auth_context?.actor_id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    let vendorId = await getVendorIdForUser(req, userId)
    
    // Super Admin authorized selection
    if (!vendorId) {
      const requestedVendorId = req.query.vendor_id as string | undefined
      if (requestedVendorId) {
        vendorId = requestedVendorId
      } else {
        return res.status(403).json({ message: "Super Admins must specify a vendor_id" })
      }
    }

    // 1. Get vendor's product IDs
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)

    // 2. Query the exact same canonical Draft Order
    const { data: quotes } = await query.graph({
      entity: "order",
      fields: [
        "id", "display_id", "email", "currency_code", "status",
        "created_at", "metadata", "customer_id",
        "items.*",
        "items.product.*",
        "items.variant.*",
        "items.variant.product.*"
      ],
      filters: {
        id: quoteId,
        metadata: { is_b2b_quote: true }
      } as any
    })

    if (quotes.length === 0) {
      return res.status(404).json({ message: "Quote not found or is not a B2B quote" })
    }

    const quote = quotes[0]

    // 3. Filter line items strictly to vendor's products
    const vendorItems = quote.items?.filter((item: any) => vendorProductIds.includes(item.product_id)) || []

    if (vendorItems.length === 0) {
      return res.status(404).json({ message: "Quote contains no items belonging to you" })
    }

    const vendorSubtotal = vendorItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0)

    // 4. Extract proper thumbnails keeping original logic intact
    const processedItems = vendorItems.map((item: any) => {
      const thumbnail = item.thumbnail ?? item.variant?.product?.thumbnail ?? item.product?.thumbnail ?? null
      return {
        id: item.id,
        title: item.title,
        variant_title: item.variant_title,
        thumbnail: thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_id: item.product_id,
        variant_id: item.variant_id
      }
    })

    const safeQuoteData = {
      id: quote.id,
      display_id: quote.display_id,
      email: quote.email,
      currency_code: quote.currency_code,
      status: quote.status,
      created_at: quote.created_at,
      metadata: quote.metadata,
      vendor_subtotal: vendorSubtotal,
      items: processedItems
    }

    return res.json({ quote: safeQuoteData })

  } catch (error: any) {
    console.error("Vendor B2B Quote Details Error:", error)
    return res.status(500).json({ error: error.message })
  }
}
