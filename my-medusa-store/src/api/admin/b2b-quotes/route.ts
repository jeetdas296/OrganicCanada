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
    const query = req.scope.resolve("query")
    const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams
    let userId = queryParams.get("debug_user_id") || (req as any).auth_context?.actor_id
    
    // Default limit/offset logic
    const {
      limit = "100",
      offset = "0",
    } = req.query as Record<string, string>

    let vendorId: string | null = null
    if (userId) {
      vendorId = await getVendorIdForUser(req, userId)
    }
    const forceVendorId = queryParams.get("debug_vendor_id")
    if (forceVendorId) vendorId = forceVendorId;

    console.log("[B2B DEBUG LIST] authenticated actor:", userId)
    console.log("[B2B DEBUG LIST] resolved vendor:", vendorId)

    if (vendorId) {
      // ----------------------------------------------------
      // VENDOR ROLE: Filtered Details
      // ----------------------------------------------------
      const { data: vendors } = await query.graph({
        entity: "vendor",
        fields: ["id", "products.*"],
        filters: { id: vendorId }
      })
      const vendorProductIds = vendors[0]?.products?.map((p: any) => p.id) || []

      const { data: quotes } = await query.graph({
        entity: "order",
        fields: [
          "id", "display_id", "email", "currency_code", "status",
          "created_at", "metadata", "customer_id",
          "items.*",
          "items.product_id",
          "items.variant_id",
          "items.product.*",
          "items.product.vendor.*"
        ],
        filters: {
          metadata: { is_b2b_quote: true }
        } as any,
        pagination: {
          skip: Number(offset),
          take: Number(limit),
          order: { created_at: "DESC" },
        },
      })

      const vendorQuotes = quotes.filter((q: any) => {
        const hasItem = q.items?.some((item: any) => vendorProductIds.includes(item.product_id))
        console.log(`[B2B DEBUG LIST] quote ${q.id} hasItem for vendor ${vendorId}: ${hasItem}`)
        if (hasItem && q.items) {
          q.items.forEach((item: any) => {
            console.log("[B2B DEBUG LIST] item:", {
              item_id: item.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              product_vendor_id: item.product?.vendor?.id,
            })
          })
        }
        return hasItem
      })

      const processedQuotes = vendorQuotes.map((q: any) => {
        const vendorItems = q.items?.filter((item: any) => vendorProductIds.includes(item.product_id)) || []
        const vendorSubtotal = vendorItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0)
        
        return {
          id: q.id,
          display_id: q.display_id,
          email: q.email,
          currency_code: q.currency_code,
          status: q.status,
          created_at: q.created_at,
          total: vendorSubtotal, // Override total for the vendor view
          items: vendorItems
        }
      })

      // Defensive deduplication
      const uniqueMap = new Map()
      processedQuotes.forEach((q: any) => uniqueMap.set(q.id, q))
      const deduplicatedQuotes = Array.from(uniqueMap.values())

      return res.json({
        quotes: deduplicatedQuotes,
        count: deduplicatedQuotes.length,
        limit: Number(limit),
        offset: Number(offset)
      })
    } else {
      // ----------------------------------------------------
      // SUPER ADMIN ROLE: Full Quotes
      // ----------------------------------------------------
      const { data: quotes } = await query.graph({
        entity: "order",
        fields: [
          "id", "display_id", "email", "currency_code", "total", "subtotal", "status",
          "created_at", "items.*", "metadata", "customer_id",
        ],
        filters: {
          metadata: { is_b2b_quote: true },
        } as any,
        pagination: {
          skip: Number(offset),
          take: Number(limit),
          order: { created_at: "DESC" },
        },
      })

      // Defensive deduplication
      const uniqueMap = new Map()
      quotes.forEach((q: any) => uniqueMap.set(q.id, q))
      const deduplicatedQuotes = Array.from(uniqueMap.values())

      return res.json({
        quotes: deduplicatedQuotes,
        count: deduplicatedQuotes.length,
        limit: Number(limit),
        offset: Number(offset),
      })
    }
  } catch (error: any) {
    console.error("Canonical B2B Quotes API Error:", error)
    return res.status(500).json({ error: error.message })
  }
}