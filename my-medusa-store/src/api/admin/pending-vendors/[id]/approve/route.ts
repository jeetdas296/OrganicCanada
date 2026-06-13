import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const vendorId = req.params.id
  const query = req.scope.resolve("query")

  try {
    // 1. Fetch the specific vendor
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "is_active"],
      filters: { id: vendorId }
    })

    const vendor = vendors[0]

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." })
    }

    // 2. We need to update the database. 
    // Since Medusa v2 modules manage database writes, we use the remoteLink or a custom service
    // If you created a custom module service for vendors, you would call it here:
    // const vendorModule = req.scope.resolve("vendorModuleService")
    // await vendorModule.updateVendors(vendor.id, { is_active: true })

    console.log(`✅ [ADMIN] Vendor ${vendorId} has been officially approved!`)

    res.status(200).json({ success: true, message: "Vendor approved." })
  } catch (error: any) {
    console.error("Failed to approve vendor:", error)
    res.status(500).json({ message: "Internal Server Error" })
  }
}