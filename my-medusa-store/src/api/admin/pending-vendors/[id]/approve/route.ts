import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const vendorId = req.params.id
    const { commission_rate } = req.body as { commission_rate?: number }

    const query = req.scope.resolve("query")
    const vendorModuleService = req.scope.resolve("vendor")

    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "is_active", "commission_rate"],
      filters: { id: vendorId },
    })

    const vendor = vendors[0]
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." })
    }

    const updatePayload: any = {
      id: vendorId,
      is_active: true,
    }

    if (commission_rate !== undefined && commission_rate !== null) {
      const rate = Number(commission_rate)
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({
          message: "commission_rate must be a valid number between 0 and 100.",
        })
      }
      updatePayload.commission_rate = rate
    }

    const updated = await vendorModuleService.updateVendors([updatePayload])

    return res.status(200).json({
      success: true,
      message: `Vendor "${vendor.name}" approved.`,
      vendor: Array.isArray(updated) ? updated[0] : updated,
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" })
  }
}