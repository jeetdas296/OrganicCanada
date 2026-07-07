// src/api/admin/b2b-quotes/[id]/approve/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { approveB2BQuoteWorkflow } from "../../../../../workflows/b2b/approve-b2b-quote"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const { result } = await approveB2BQuoteWorkflow(req.scope).run({
      input: { quote_id: id },
    })

    return res.json({
      message: "Quote approved and order created successfully",
      quote: result.quote,
      order: result.order,
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to approve quote",
      error: error.message,
    })
  }
}