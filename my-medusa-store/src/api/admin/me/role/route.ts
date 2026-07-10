import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const userId = (req as any).auth_context?.actor_id
  if (!userId) {
    return res.json({ role: "admin" })
  }

  try {
    const query = req.scope.resolve("query")
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: userId }
    })
    
    if (users.length > 0 && users[0].vendor?.id) {
      return res.json({ role: "vendor", vendor_id: users[0].vendor.id })
    }

    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id"],
      filters: { user_id: userId }
    })

    if (vendors.length > 0 && vendors[0].id) {
      return res.json({ role: "vendor", vendor_id: vendors[0].id })
    }

    return res.json({ role: "admin" })
  } catch (err) {
    return res.json({ role: "admin" })
  }
}
