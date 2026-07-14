import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve("query")
    const requestedVendorId = req.query.vendor_id as string | undefined

    // --- AUTH CHECK ---
    const userId = (req as any).auth_context?.actor_id
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    let targetVendor: any = null

    // Determine who the logged-in user is
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: userId },
    })
    const loggedInVendor = users[0]?.vendor || null
    const isSuperAdmin = !loggedInVendor

    if (requestedVendorId) {
      // --- IDOR CHECK: Only super admins can view other vendors' stats ---
      if (!isSuperAdmin && loggedInVendor?.id !== requestedVendorId) {
        return res.status(403).json({ message: "Forbidden" })
      }

      const { data: vendors } = await query.graph({
        entity: "vendor",
        fields: ["id", "name", "commission_rate"],
        filters: { id: requestedVendorId },
      })
      targetVendor = vendors[0]
    } else {
      // Vendor viewing own dashboard
      targetVendor = loggedInVendor
    }

    if (!targetVendor) {
      return res.status(200).json({
        stats: [],
        vendorName: "Unknown",
        commissionRate: 15,
      })
    }

    const commissionRate = Number(targetVendor.commission_rate ?? 15)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "items.product_id"],
    })

    const stats: any[] = []

    for (const order of orders) {
      if (!order.items) continue

      for (const item of order.items) {
        if (!item?.product_id) continue

        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "vendor.*"],
          filters: { id: item.product_id },
        })

        const productVendor = products[0]?.vendor
        if (productVendor?.id === targetVendor.id) {
          const gross = item.unit_price * item.quantity
          const fee = gross * (commissionRate / 100)
          const net = gross - fee

          stats.push({
            order_id: order.id,
            title: item.title,
            quantity: item.quantity,
            gross,
            fee,
            net,
          })
        }
      }
    }

    return res.status(200).json({
      stats,
      vendorName: targetVendor.name,
      commissionRate,
    })
  } catch (error: any) {
    console.error("[VENDOR STATS] Error:", error.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}