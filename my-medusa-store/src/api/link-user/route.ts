import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const userId = req.query.user_id as string
    const vendorId = req.query.vendor_id as string

    if (!userId || !vendorId) {
      return res.status(400).json({ error: "Missing user_id or vendor_id" })
    }

    // 1. Resolve your custom Vendor module 
    // Note: If you named your module something different in medusa-config.ts, 
    // change "vendorModuleService" to match your exact key.
    const vendorModule = req.scope.resolve("vendorModuleService")

    // 2. Simply update the vendor's user_id column directly! 
    // No more complex Remote Links, dismissals, or multiple-link errors.
    await vendorModule.updateVendors({
      id: vendorId,
      user_id: userId
    })

    return res.status(200).json({
      success: true,
      message: `User ${userId} successfully linked to Vendor ${vendorId} via direct column!`,
    })
  } catch (error: any) {
    console.error("[link-user] ERROR:", error.message)
    return res.status(500).json({ error: error.message })
  }
}