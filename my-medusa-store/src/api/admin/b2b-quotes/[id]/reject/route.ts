// src/api/admin/b2b-quotes/[id]/reject/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { rejectB2BQuoteWorkflow } from "../../../../../workflows/b2b/approve-b2b-quote"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { reason } = req.body as { reason?: string }

  try {
    const { result } = await rejectB2BQuoteWorkflow(req.scope).run({
      input: { quote_id: id, reason },
    })

    return res.json({
      message: "Quote rejected",
      quote: result.quote,
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to reject quote",
      error: error.message,
    })
  }
}