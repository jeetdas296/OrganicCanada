import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const vendorId = req.params.id
    const query = req.scope.resolve("query")

    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "email", "handle", "commission_rate", "is_active"],
      filters: { id: vendorId },
    })

    const vendor = vendors[0]
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." })
    }

    return res.status(200).json({ vendor })
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" })
  }
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const vendorId = req.params.id
    const { commission_rate } = req.body as { commission_rate?: number }

    const rate = Number(commission_rate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        message: "commission_rate must be a valid number between 0 and 100.",
      })
    }

    const vendorModuleService = req.scope.resolve("vendor")

    // Important: use object payload (or array payload) with id inside.
    // This avoids the "Vendor with id \"\" not found" issue from wrong signature usage.
    const updated = await vendorModuleService.updateVendors([
      {
        id: vendorId,
        commission_rate: rate,
      },
    ])

    return res.status(200).json({
      success: true,
      vendor: Array.isArray(updated) ? updated[0] : updated,
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" })
  }
}