import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const createVendorFulfillmentsStep = createStep(
  "create-vendor-fulfillments-step",
  async ({ vendorGroups, orderId }: { vendorGroups: Record<string, any[]>, orderId: string }, { container }) => {
    
    console.log("\n🚚 Generating distinct packing slips and calculating payouts...")
    
    // We need the query engine to fetch the farm's commission rate
    const query = container.resolve("query")

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      
      // Calculate the gross subtotal for this specific vendor
      let vendorTotal = 0
      items.forEach(item => {
        vendorTotal += (item.quantity * item.price)
      })

      // 🏢 Handle Main Warehouse Items
      if (vendorId === "platform_direct") {
        console.log(`\n--- 🏢 MAIN WAREHOUSE PACKING LIST ---`)
        items.forEach(item => console.log(` • [x${item.quantity}] ${item.title} ($${item.price} ea)`))
        console.log(` 💰 Platform Keeps 100%: $${vendorTotal}`)
        console.log(` 🔗 Parent Order: ${orderId}`)
        continue
      } 

      // 🚜 Handle Farm Vendor Items
      let commissionRate = 15 // Fallback default
      let vendorName = vendorId

      try {
        // Fetch the specific vendor's profile from your custom database!
        const { data: [vendor] } = await query.graph({
          entity: "vendor",
          fields: ["id", "name", "commission_rate"],
          filters: { id: vendorId }
        })
        
        if (vendor) {
          commissionRate = vendor.commission_rate
          vendorName = vendor.name
        }
      } catch (err) {
        console.log("⚠️ Could not fetch vendor profile for payout calculation.")
      }

      // 🧮 Do the exact payout math
      const platformFee = vendorTotal * (commissionRate / 100)
      const vendorPayout = vendorTotal - platformFee

      console.log(`\n--- 🚜 VENDOR PACKING LIST: ${vendorName} ---`)
      items.forEach(item => console.log(` • [x${item.quantity}] ${item.title} ($${item.price} ea)`))
      console.log(` 📊 Gross Subtotal: $${vendorTotal}`)
      console.log(` ✂️ Platform Fee (${commissionRate}%): $${platformFee.toFixed(2)}`)
      console.log(` 💸 Net Payout to Farm: $${vendorPayout.toFixed(2)}`)
      console.log(` 🔗 Parent Order: ${orderId}`)
    }

    console.log("\n🎉 Order Split & Payout Workflow Completed Successfully!")
    return new StepResponse({ success: true })
  }
)