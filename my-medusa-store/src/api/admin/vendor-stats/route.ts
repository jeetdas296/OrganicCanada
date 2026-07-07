import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve("query")
    const requestedVendorId = req.query.vendor_id as string | undefined

    let targetVendor: any = null

    if (requestedVendorId) {
      // Super admin viewing specific vendor
      const { data: vendors } = await query.graph({
        entity: "vendor",
        fields: ["id", "name", "commission_rate"],
        filters: { id: requestedVendorId },
      })
      targetVendor = vendors[0]
    } else {
      // Vendor viewing own dashboard
      const userId = (req as any).auth_context?.actor_id
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" })
      }

      const { data: users } = await query.graph({
        entity: "user",
        fields: ["id", "vendor.*"],
        filters: { id: userId },
      })

      targetVendor = users[0]?.vendor || null
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
    return res.status(500).json({ error: error.message || "Internal Server Error" })
  }
}