import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productId = req.query.product_id as string
    const vendorId = req.query.vendor_id as string

    if (!productId || !vendorId) {
      return res.status(400).json({ error: "Missing product_id or vendor_id in the URL" })
    }

    // 🟢 THE MAGIC: Medusa's Remote Link Engine
    const remoteLink = req.scope.resolve("remoteLink")
    
    await remoteLink.create({
      [Modules.PRODUCT]: {
        product_id: productId,
      },
      "vendor": {
        vendor_id: vendorId,
      },
    })

    return res.status(200).json({ 
      success: true, 
      message: `Successfully linked Product (${productId}) to Vendor (${vendorId})!` 
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}