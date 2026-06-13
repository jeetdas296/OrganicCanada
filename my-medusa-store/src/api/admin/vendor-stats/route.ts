import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve("query")

    // 1. Fetch Sunnybrook Farm's specific profile
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "commission_rate"],
      filters: { handle: "sunnybrook-organic-farm" }
    })

    const sunnybrook = vendors[0]
    if (!sunnybrook) return res.json({ stats: [], vendorName: "Unknown" })

    // 2. Fetch all orders in the system
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "items.product_id"],
    })

    const stats: any[] = []

    // 3. Scan the orders for Sunnybrook's specific products
    for (const order of orders) {
      if (!order.items) continue

      for (const item of order.items) {
        if (!item || !item.product_id) continue

        // Check if this specific item is linked to Sunnybrook
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "vendor.*"],
          filters: { id: item.product_id },
        })

        const productVendor = products[0]?.vendor
        
        if (productVendor && productVendor.id === sunnybrook.id) {
          const gross = item.unit_price * item.quantity
          const fee = gross * (sunnybrook.commission_rate / 100)
          const net = gross - fee

          stats.push({
            order_id: order.id,
            title: item.title,
            quantity: item.quantity,
            gross,
            fee,
            net
          })
        }
      }
    }

    return res.status(200).json({ stats, vendorName: sunnybrook.name })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}