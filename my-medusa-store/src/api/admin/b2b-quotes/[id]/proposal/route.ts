import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ProposalAgreementService } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "status",
      "total",
      "subtotal",
      "shipping_subtotal",
      "shipping_total",
      "shipping_tax_total",
      "tax_total",
      "discount_total",
      "currency_code",
      "region_id",
      "region.*",
      "metadata",
      "items.*",
      "shipping_methods.*",
    ],
    filters: { id: targetQuoteId },
  })

  const order = orders?.[0]
  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "B2B Quote not found" })
  }

  const isLocked = ProposalAgreementService.isQuoteLocked(
    order.metadata?.quote_status as string | undefined
  )

  return res.json({
    proposal: order,
    is_locked: isLocked,
    quote_status: order.metadata?.quote_status || "pending",
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id || "admin"
  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: targetQuoteId },
  })

  const order = orders?.[0]
  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "B2B Quote not found" })
  }

  try {
    const body = req.body as any

    if (body.action === "approve") {
      const result = await ProposalAgreementService.approveProposalAgreement({
        orderId: targetQuoteId,
        actorId: callerId,
        scope: req.scope,
      })
      
      return res.json({
        success: true,
        order: result.order,
        message: result.message,
      })
    }

    const result = await ProposalAgreementService.updateProposalAgreement({
      orderId: targetQuoteId,
      actorId: callerId,
      senderType: "admin",
      changes: body,
      scope: req.scope,
    })

    return res.json({
      success: true,
      order: result.order,
      message: result.message,
      structured_diff: result.structured_diff,
    })
  } catch (error: any) {
    console.error("Admin Proposal update/approve error:", error)
    return res.status(error.status || 400).json({
      message: error.message || "Failed to update Proposal Agreement",
    })
  }
}
