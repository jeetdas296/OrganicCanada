import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const groupOrderItemsStep = createStep(
  "group-order-items-step",
  async ({ orderId }: { orderId: string }, { container }) => {
    console.log(`\n📦 Initiating Order Split for Order: ${orderId}`)
    
    const query = container.resolve("query")

    // 1. Fetch the full order details. (Explicitly requesting product_id this time!)
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "items.product_id"],
      filters: { id: orderId },
    })

    if (!order || !order.items) {
      console.log("❌ Order not found or has no items.")
      return new StepResponse({ vendorGroups: {} })
    }

    const vendorGroups: Record<string, any[]> = {}

    // 3. Loop through every item in the cart
    for (const item of order.items) {
      if (!item) continue;
      let vendorId = "platform_direct" // Default to main warehouse

      // 🟢 THE FIX: Only query if product_id actually exists, and use the safe graph engine
      if (item.product_id) {
        try {
          const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "vendor.*"], // Seamlessly jump the bridge to the vendor!
            filters: { id: item.product_id },
          })

          // If the product exists and has a linked vendor, use that vendor's ID!
          if (products.length > 0 && products[0].vendor?.id) {
            vendorId = products[0].vendor.id
          }
        } catch (err) {
          console.log(`⚠️ Could not fetch vendor link for product ${item.product_id}`)
        }
      }

      // Add the item to the correct vendor's packing list
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = []
      }
      
      vendorGroups[vendorId].push({
        item_id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.unit_price,
      })
    }

    console.log(`✅ Grouping complete! Found ${Object.keys(vendorGroups).length} distinct vendors for this order.`)
    return new StepResponse({ vendorGroups })
  }
)