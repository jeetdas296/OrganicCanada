import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createProductsWorkflow } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const userId = (req as any).auth_context?.actor_id
  if (!userId) return res.status(401).json({ message: "Unauthorized" })

  const { title, prices, file_url, file_name } = req.body as any
  const query = req.scope.resolve("query")

  if (!file_url) {
    return res.status(400).json({ message: "A file upload is required for digital products." })
  }

  // Ensure prices were actually sent
  if (!prices || Object.keys(prices).length === 0) {
    return res.status(400).json({ message: "Pricing is required for all supported currencies." })
  }

  try {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: userId }
    })
    const targetVendorId = users[0]?.vendor?.id || null 

    const { data: salesChannels } = await query.graph({ entity: "sales_channel", fields: ["id"] })
    const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"] })

    // 🟢 1. Search for the "Default" profile
    let targetProfile = shippingProfiles.find(sp => sp.name.toLowerCase().includes("default"))
    
    // 🟢 2. FALLBACK: Grab whatever the first profile is if "Default" isn't found
    if (!targetProfile && shippingProfiles.length > 0) {
      targetProfile = shippingProfiles[2]
      console.warn(`⚠️ Using fallback shipping profile: ${targetProfile.name}`)
    }

    if (!targetProfile) {
      return res.status(400).json({ message: "System Error: No shipping profiles exist in your store." })
    }

    // 🟢 Format the prices array
    const formattedPrices = Object.entries(prices).map(([code, amount]) => ({
      currency_code: code.toLowerCase(),
      amount: parseFloat(amount as string)
    }))

    const { result: createdProducts } = await createProductsWorkflow(req.scope).run({
      input: {
        products: [{
          title: title,
          status: "published", // 🟢 NEW: Forces the product to be live immediately!
          shipping_profile_id: targetProfile.id, 
          sales_channels: salesChannels.map(sc => ({ id: sc.id })), 
          type_id: "ptyp_01KTEXEFZTF7QV31G6HAMYAQNY",
          options: [{ title: "Digital Delivery", values: ["Instant Download"] }],
          variants: [{
            title: "Standard License",
            prices: formattedPrices, 
            manage_inventory: false, 
          }],
        }]
      }
    })

    const newProduct = createdProducts[0]
    const newVariant = newProduct.variants[0]
    const remoteLink = req.scope.resolve("remoteLink")

    if (targetVendorId) {
      await remoteLink.create([{
        "vendor": { vendor_id: targetVendorId },
        [Modules.PRODUCT]: { product_id: newProduct.id },
      }])
    }

    const digitalAssetModule = req.scope.resolve("digitalAssetModuleService")
    const asset = await digitalAssetModule.createDigitalAssets({
      name: file_name || title,
      file_url: file_url,
    })

    await remoteLink.create([{
      [Modules.PRODUCT]: { product_variant_id: newVariant.id },
      "digitalAssetModuleService": { digital_asset_id: asset.id },
    }])

    res.status(200).json({ success: true, product: newProduct })
  } catch (err: any) {
    console.error("Digital Product Error:", err.message)
    res.status(500).json({ message: "Failed to create digital product." })
  }
}