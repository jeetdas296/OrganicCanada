import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const query = req.scope.resolve("query")
  const downloads: any[] = []

  console.log(`\n========================================`)
  console.log(`🔍 [WIDGET DEBUG] Storefront asking for files on: ${orderId}`)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "items.variant_id"],
      filters: { id: orderId }
    })

    const order = orders[0]
    if (!order) {
      console.log("❌ Order not found in database!")
      return res.status(200).json({ downloads })
    }

    for (const item of order.items ?? []) {
      if (!item) continue
      if (!item.variant_id) continue

      console.log(`🛒 Inspecting Cart Item: ${item.title} (Variant: ${item.variant_id})`)

      let linkedAssets: Array<any> = []

      // 🕵️ TEST 1: The Pluralized Name (digital_assets)
      try {
        const { data } = await query.graph({ entity: "variant", fields: ["id", "digital_assets.*"], filters: { id: item.variant_id } })
        linkedAssets = data[0]?.digital_assets || []
        if (linkedAssets.length > 0) console.log("✅ BINGO! Found the link under 'digital_assets'")
      } catch (e) {
        console.log("❌ Failed Test 1 ('digital_assets'):", e.message)
      }

      // 🕵️ TEST 2: The CamelCase Name (digitalAsset)
      if (linkedAssets.length === 0) {
        try {
          const { data } = await query.graph({ entity: "variant", fields: ["id", "digitalAsset.*"], filters: { id: item.variant_id } })
          linkedAssets = (data[0] as any)?.digitalAsset || []
          if (linkedAssets.length > 0) console.log("✅ BINGO! Found the link under 'digitalAsset'")
        } catch (e) {
          console.log("❌ Failed Test 2 ('digitalAsset'):", e.message)
        }
      }

      // 🕵️ TEST 3: The Exact Module Name (digitalAssetModuleService)
      if (linkedAssets.length === 0) {
        try {
          const { data } = await query.graph({ entity: "variant", fields: ["id", "digitalAssetModuleService.*"], filters: { id: item.variant_id } })
          linkedAssets = (data[0] as any)?.digitalAssetModuleService || []
          if (linkedAssets.length > 0) console.log("✅ BINGO! Found the link under 'digitalAssetModuleService'")
        } catch (e) {
          console.log("❌ Failed Test 3 ('digitalAssetModuleService'):", e.message)
        }
      }

      // 📦 Extraction Phase
      if (linkedAssets.length > 0) {
        console.log(`🎉 Success! Found ${linkedAssets.length} file(s) for this item!`)
        linkedAssets.forEach((asset: any) => {
          downloads.push({
            item_title: item.title,
            file_name: asset.name || "Download",
            file_url: asset.file_url
          })
        })
      } else {
        console.log(`⚠️ CRITICAL: Medusa confirms there is absolutely no digital file linked to this product in the database.`)
      }
    }

    console.log(`📤 Sending ${downloads.length} files to Storefront Widget...`)
    console.log(`========================================\n`)
    res.status(200).json({ downloads })

  } catch (error: any) {
    console.error("❌ Fatal API Error:", error.message)
    res.status(500).json({ downloads: [] })
  }
}