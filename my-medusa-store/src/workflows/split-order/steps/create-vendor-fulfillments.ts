import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type VendorGroupItem = {
  title: string
  quantity: number
  price?: number
  unit_price?: number
}

export const createVendorFulfillmentsStep = createStep(
  "create-vendor-fulfillments-step",
  async (
    {
      vendorGroups,
      orderId,
    }: { vendorGroups: Record<string, VendorGroupItem[]>; orderId: string },
    { container }
  ) => {
    console.log("\n🚚 Generating distinct packing slips and calculating payouts...")

    const query = container.resolve("query")

    // 1) Get all real vendor IDs from groups (exclude platform bucket)
    const vendorIds = Object.keys(vendorGroups).filter(
      (id) => id !== "platform_direct"
    )

    // 2) Fetch all vendor commission rates in one query (faster and cleaner)
    const commissionMap = new Map<string, { name: string; commission_rate: number }>()

    if (vendorIds.length) {
      const { data: vendors } = await query.graph({
        entity: "vendor",
        fields: ["id", "name", "commission_rate"],
        filters: { id: vendorIds },
      })

      for (const v of vendors || []) {
        commissionMap.set(v.id, {
          name: v.name,
          commission_rate: Number(v.commission_rate ?? 0),
        })
      }
    }

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      // Calculate subtotal for this vendor group
      let vendorTotal = 0
      for (const item of items) {
        const unit = Number(item.price ?? item.unit_price ?? 0)
        vendorTotal += Number(item.quantity || 0) * unit
      }

      // Platform direct items (warehouse-owned)
      if (vendorId === "platform_direct") {
        console.log(`\n--- 🏢 MAIN WAREHOUSE PACKING LIST ---`)
        items.forEach((item) =>
          console.log(` • [x${item.quantity}] ${item.title} ($${item.price ?? item.unit_price ?? 0} ea)`)
        )
        console.log(` 📊 Gross Subtotal: $${vendorTotal.toFixed(2)}`)
        console.log(` 💰 Platform Keeps 100%: $${vendorTotal.toFixed(2)}`)
        console.log(` 🔗 Parent Order: ${orderId}`)
        continue
      }

      // Vendor items -> must use vendor's own commission from DB
      const vendorProfile = commissionMap.get(vendorId)

      if (!vendorProfile) {
        // Fail fast so you never silently apply wrong payout
        throw new Error(
          `Vendor profile not found for vendorId=${vendorId} during split-order payout calculation`
        )
      }

      const commissionRate = Number(vendorProfile.commission_rate)
      const vendorName = vendorProfile.name || vendorId

      const platformFee = vendorTotal * (commissionRate / 100)
      const vendorPayout = vendorTotal - platformFee

      console.log(`\n--- 🚜 VENDOR PACKING LIST: ${vendorName} ---`)
      items.forEach((item) =>
        console.log(` • [x${item.quantity}] ${item.title} ($${item.price ?? item.unit_price ?? 0} ea)`)
      )
      console.log(` 📊 Gross Subtotal: $${vendorTotal.toFixed(2)}`)
      console.log(` ✂️ Platform Fee (${commissionRate}%): $${platformFee.toFixed(2)}`)
      console.log(` 💸 Net Payout to Farm: $${vendorPayout.toFixed(2)}`)
      console.log(` 🔗 Parent Order: ${orderId}`)
    }

    console.log("\n🎉 Order Split & Payout Workflow Completed Successfully!")
    return new StepResponse({ success: true })
  }
)