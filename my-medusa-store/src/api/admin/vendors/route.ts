import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve("query")
    const userId = (req as any).auth_context?.actor_id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Check if logged-in admin user is a vendor user
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: userId },
    })

    const loggedInVendor = users[0]?.vendor

    // Vendor user: return only own vendor profile
    if (loggedInVendor?.id) {
      return res.status(200).json({ vendors: [loggedInVendor] })
    }

    // Super admin: return all vendors
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: [
        "id",
        "name",
        "email",
        "handle",
        "commission_rate",
        "is_active",
        "created_at",
      ],
    })

    return res.status(200).json({ vendors })
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" })
  }
}