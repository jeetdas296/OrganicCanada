import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ message: "Quote ID required" })

    const query = req.scope.resolve("query")
    const userId = (req as any).auth_context?.actor_id

    let vendorId: string | null = null
    if (userId) {
      vendorId = await getVendorIdForUser(req, userId)
    }

    console.log("[B2B DEBUG DETAIL] authenticated actor:", userId)
    console.log("[B2B DEBUG DETAIL] resolved vendor:", vendorId)
    console.log("[B2B DEBUG DETAIL] requested quote id:", id)

    if (vendorId) {
      // ----------------------------------------------------
      // VENDOR ROLE: Filtered Details
      // ----------------------------------------------------
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"]
      })
      const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)

      const { data: quotes } = await query.graph({
        entity: "order",
        fields: [
          "id", "display_id", "email", "currency_code", "status",
          "created_at", "metadata", "customer_id",
          "items.*",
          "items.product_id",
          "items.variant_id",
          "items.product.*",
          "items.variant.*",
          "items.variant.product.*"
        ],
        filters: {
          id: id,
          metadata: { is_b2b_quote: true }
        } as any
      })

      if (quotes.length === 0) {
        console.log(`[B2B DEBUG DETAIL] Quote ${id} not found or not B2B`)
        return res.status(404).json({ message: "Quote not found or is not a B2B quote" })
      }

      const quote = quotes[0]
      const vendorItems = quote.items?.filter((item: any) => vendorProductIds.includes(item.product_id)) || []
      
      console.log(`[B2B DEBUG DETAIL] Quote ${id} items count: ${quote.items?.length}, vendor items count: ${vendorItems.length}`)
      if (quote.items) {
        quote.items.forEach((item: any) => {
          console.log("[B2B DEBUG DETAIL] item:", {
            item_id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_vendor_id: item.product?.vendor?.id,
          })
        })
      }

      if (vendorItems.length === 0) {
        return res.status(404).json({ message: "Quote contains no items belonging to you" })
      }

      const vendorSubtotal = vendorItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0)

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

    } else {
      // ----------------------------------------------------
      // SUPER ADMIN ROLE: Full Details
      // ----------------------------------------------------
      const { data: orders } = await query.graph({
        entity: "order",
        filters: { id } as any,
        fields: [
          "id", "display_id", "status", "email", "currency_code", "total", "subtotal",
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

  } catch (error: any) {
    console.error("Canonical B2B Quote Details Error:", error)
    return res.status(500).json({ error: error.message })
  }
}