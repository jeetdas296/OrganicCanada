// File: src/api/admin/vendors/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve("query")
    
    // Fetch all vendors from the database
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "user_id"] // We need user_id to know who owns what
    })

    return res.status(200).json({ vendors })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}