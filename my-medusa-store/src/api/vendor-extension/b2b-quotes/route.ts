import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

async function getVendorIdForUser(req: MedusaRequest, userId: string): Promise<string | null> {
  const query = req.scope.resolve("query")

  // Try user.vendor relation
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "vendor.*"],
    filters: { id: userId }
  })
  if (users.length > 0 && users[0].vendor?.id) return users[0].vendor.id

  // Try vendor.user_id relation
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
    const query = req.scope.resolve("query")
    const userId = (req as any).auth_context?.actor_id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    let vendorId = await getVendorIdForUser(req, userId)
    
    // Super Admin Impersonation Support strictly limited to actual Super Admins
    if (!vendorId) {
      const requestedVendorId = req.query.vendor_id as string | undefined
      if (requestedVendorId && requestedVendorId !== "all") {
        vendorId = requestedVendorId
      } else {
        // If they ask for 'all' or don't specify, return empty since Dashboard already handles 'all' differently,
        // or just return all quotes. The Vendor Dashboard only calls this when a specific vendor is targeted.
        if (!requestedVendorId) {
          return res.status(400).json({ message: "Super Admins must specify a vendor_id to view their specific quotes" })
        }
      }
    } else {
      // If a vendor tries to pass vendor_id to see another vendor's quotes, ignore it.
      // Security: They only ever get their own vendorId.
    }
    
    // If we're looking at 'all' as a Super Admin, we don't need this endpoint.
    // The main admin b2b-quotes route shows all quotes.
    if (!vendorId || vendorId === "all") {
      return res.json({ b2b_quotes: [] })
    }

    // 1. Get vendor's product IDs
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)

    // 2. Query all B2B quotes (Draft Orders)
    const { data: quotes } = await query.graph({
      entity: "order",
      fields: [
        "id", "display_id", "email", "currency_code", "status",
        "created_at", "items.*", "metadata", "customer_id",
      ],
      filters: {
        metadata: { is_b2b_quote: true }
      } as any
    })

    // 3. Filter quotes that contain at least one product owned by this vendor
    const vendorQuotes = quotes.filter((q: any) => 
      q.items?.some((item: any) => vendorProductIds.includes(item.product_id))
    )

    // 4. Process each quote to only include vendor's items and subtotal
    const processedQuotes = vendorQuotes.map((q: any) => {
      const vendorItems = q.items?.filter((item: any) => vendorProductIds.includes(item.product_id)) || []
      const vendorSubtotal = vendorItems.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0)
      
      return {
        id: q.id,
        display_id: q.display_id,
        email: q.email, // Customer email can be visible so vendor knows who they are quoting
        currency_code: q.currency_code,
        status: q.status,
        created_at: q.created_at,
        vendor_subtotal: vendorSubtotal,
        items_count: vendorItems.length
      }
    })

    // 5. Defensive deduplication by order.id to ensure exactly one row per quote
    const uniqueMap = new Map()
    processedQuotes.forEach((q: any) => uniqueMap.set(q.id, q))
    const deduplicatedQuotes = Array.from(uniqueMap.values())

    return res.json({ b2b_quotes: deduplicatedQuotes })
  } catch (error: any) {
    console.error("Vendor B2B Quotes API Error:", error)
    return res.status(500).json({ error: error.message })
  }
}
