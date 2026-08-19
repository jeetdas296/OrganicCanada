import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authHeader = req.headers.authorization
    const cookieHeader = req.headers.cookie

    const baseUrl = `http://${req.headers.host}`
    
    // Fetch from the standard draft-orders endpoint
    const response = await fetch(`${baseUrl}/admin/draft-orders?limit=100`, {
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {})
      }
    })
    
    const data = await response.json()
    
    if (!data.draft_orders) {
      return res.json({ error: "No draft_orders in response", data })
    }
    
    const allIds = data.draft_orders.map((d: any) => d.id)
    const uniqueIds = new Set(allIds)
    
    const duplicates: any[] = []
    if (allIds.length !== uniqueIds.size) {
      const counts: Record<string, number> = {}
      for (const id of allIds) {
        counts[id] = (counts[id] || 0) + 1
        if (counts[id] > 1) {
          duplicates.push(id)
        }
      }
    }

    return res.json({
      total_returned: allIds.length,
      unique_count: uniqueIds.size,
      has_duplicates: allIds.length !== uniqueIds.size,
      duplicates,
      first_few_ids: allIds.slice(0, 5)
    })
  } catch (error: any) {
    return res.json({ error: error.message })
  }
}
