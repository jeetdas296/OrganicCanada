import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")

  // --- AUTH CHECK: Only authenticated admin users ---
  const userId = (req as any).auth_context?.actor_id
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  // Use the Query Graph to fetch only inactive vendors
  const { data: vendors } = await query.graph({
    entity: "vendor",
    fields: ["id", "name", "email", "created_at"],
    filters: { is_active: false }
  })

  res.json({ vendors })
}