import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../modules/vendor"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const vendorService = req.scope.resolve(VENDOR_MODULE)
    
    // Create "Sunnybrook Organic Farm"
    const newVendor = await vendorService.createVendors({
      name: "Sunnybrook Organic Farm",
      email: "sunnybrook@farm.com",
      handle: "sunnybrook-organic-farm",
      commission_rate: 15,
      is_active: true
    })

    return res.status(200).json({ success: true, vendor: newVendor })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}