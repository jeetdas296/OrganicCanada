import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE, ProposalAgreementService } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

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
      "items.product_id",
      "shipping_methods.*",
    ],
    filters: { id: targetQuoteId },
  })

  const order = orders?.[0]
  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "B2B Quote not found" })
  }

  // Inject vendor info into items
  if (order.items && order.items.length > 0) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    
    order.items = order.items.map((item: any) => {
      const p = products.find((prod: any) => prod.id === item.product_id)
      if (p?.vendor) {
        return { ...item, vendor: p.vendor }
      }
      return item
    })
  }

  const companyService = req.scope.resolve(COMPANY_MODULE)
  if (!order.customer_id) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const isAllowed = await companyService.isCustomerInSameCompany(
    callerId,
    order.customer_id as string,
    query
  )
  if (!isAllowed) {
    return res.status(403).json({ message: "Forbidden" })
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
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "metadata"],
    filters: { id: targetQuoteId },
  })

  const order = orders?.[0]
  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "B2B Quote not found" })
  }

  const companyService = req.scope.resolve(COMPANY_MODULE)
  if (!order.customer_id) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const isAllowed = await companyService.isCustomerInSameCompany(
    callerId,
    order.customer_id as string,
    query
  )
  if (!isAllowed) {
    return res.status(403).json({ message: "Forbidden" })
  }

  try {
    const result = await ProposalAgreementService.updateProposalAgreement({
      orderId: targetQuoteId,
      actorId: callerId,
      senderType: "customer",
      changes: req.body as any,
      scope: req.scope,
    })

    return res.json({
      success: true,
      order: result.order,
      message: result.message,
      messages: result.messages,
      structured_diff: result.structured_diff,
    })
  } catch (error: any) {
    console.error("Store Proposal update error:", error)
    return res.status(error.status || 400).json({
      message: error.message || "Failed to update Proposal Agreement",
    })
  }
}
