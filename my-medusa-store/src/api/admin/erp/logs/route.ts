import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/erp/logs
 * Fetches paginated ERP synchronization logs.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const erpModuleService = req.scope.resolve("erp")
  const query = req.scope.resolve("query")
  const userId = (req as any).auth_context?.actor_id

  const limit = parseInt(req.query.limit as string || "20", 10)
  const offset = parseInt(req.query.offset as string || "0", 10)

  try {
    // Security: Block vendors from accessing ERP logs
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

    const [logs, count] = await erpModuleService.listAndCountErpSyncLogs({}, {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" }
    })

    return res.status(200).json({ logs, count, limit, offset })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
