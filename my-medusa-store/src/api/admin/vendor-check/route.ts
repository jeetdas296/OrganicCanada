import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const userId = (req as any).auth_context?.actor_id
  if (!userId) return res.json({ is_vendor: false })

  const query = req.scope.resolve("query")
  
  try {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"], // 🟢 This pulls the relational farm data!
      filters: { id: userId }
    })
    
    const vendor = users[0]?.vendor
    const isVendor = !!vendor?.id

    res.json({ 
      is_vendor: isVendor,
      vendor: vendor || null // 🟢 Send the actual farm data back to the dashboard!
    })
  } catch(e) {
    res.json({ is_vendor: false })
  }
}