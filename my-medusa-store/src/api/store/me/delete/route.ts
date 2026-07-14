import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const customerService = req.scope.resolve(Modules.CUSTOMER)
    await customerService.deleteCustomers([customerId])

    return res.status(200).json({ success: true, message: "Account deleted successfully" })
  } catch (error: any) {
    console.error("❌ Failed to delete account:", error.message)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
