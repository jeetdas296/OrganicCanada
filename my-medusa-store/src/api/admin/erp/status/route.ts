import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/erp/status
 * Checks the connection status to the ERPNext VM.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const erpModuleService = req.scope.resolve("erp")
  const query = req.scope.resolve("query")
  const userId = (req as any).auth_context?.actor_id

  try {
    // Security: Block vendors from accessing ERP status
    if (userId) {
      const { data: users } = await query.graph({
        entity: "user",
        fields: ["id", "vendor.id"],
        filters: { id: userId }
      })
      if (users[0]?.vendor?.id) {
        return res.status(403).json({ message: "Forbidden. Vendors cannot access ERP functions." })
      }
    }

    const isConnected = await erpModuleService.ping()
    
    return res.status(200).json({ 
      status: isConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return res.status(200).json({ 
      status: "disconnected", 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
