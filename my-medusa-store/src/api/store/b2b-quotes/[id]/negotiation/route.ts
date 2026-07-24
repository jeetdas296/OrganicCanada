import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log("NEGOTIATION API HIT")
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id

  console.log("Caller:", callerId)
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  // 1. Validate Draft Order belongs to caller
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "metadata", "status"],
    filters: { id } // Use original id to fetch current order status/owner
  })

  const draftOrder = orders?.[0]
  if (!draftOrder || draftOrder.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "Quote not found" })
  }

  const companyService = req.scope.resolve(COMPANY_MODULE)

  if (!draftOrder.customer_id) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const isAllowed = await companyService.isCustomerInSameCompany(callerId, draftOrder.customer_id as string, query)

  if (!isAllowed) {
    return res.status(403).json({ message: "Forbidden" })
  }

  let [conversation] = await companyService.listQuoteConversations(
    { quote_id: targetQuoteId },
    { relations: ["messages"] }
  )

  // Fix Quote Lifecycle Status mapping
  // Valid Medusa order statuses: 'pending' | 'draft' | 'canceled' | 'archived' | 'requires_action'
  if (conversation && conversation.status !== "closed" && (draftOrder.status === "completed" || draftOrder.status === "canceled")) {
    conversation = await companyService.updateQuoteConversations({
      id: conversation.id,
      status: "closed"
    })
  }

  return res.json({
    conversation: conversation || null,
    order_status: draftOrder.status
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { text, action } = req.body as any
  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  // 1. Validate Draft Order belongs to caller
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "metadata"],
    filters: { id }
  })

  const draftOrder = orders?.[0]
  if (!draftOrder || draftOrder.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "Quote not found" })
  }

  const companyService = req.scope.resolve(COMPANY_MODULE)

  if (!draftOrder.customer_id) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const isAllowed = await companyService.isCustomerInSameCompany(callerId, draftOrder.customer_id as string, query)

  if (!isAllowed) {
    return res.status(403).json({ message: "Forbidden" })
  }

  // 2. Find or create conversation
  let [conversation] = await companyService.listQuoteConversations({ quote_id: targetQuoteId })

  if (!conversation) {
    const company = await companyService.getCompanyForCustomer(callerId, query)

    conversation = await companyService.createQuoteConversations({
      quote_id: targetQuoteId,
      company_id: company?.id || callerId, // Fallback to callerId if somehow not linked
      status: "open",
    })
  }

  if (conversation.status === "closed") {
    return res.status(400).json({ message: "Negotiation is closed" })
  }

  if (action === "accept") {
    conversation = await companyService.updateQuoteConversations({
      id: conversation.id,
      status: "agreement_reached"
    })
    return res.json({ conversation })
  }

  const message = await companyService.createQuoteMessages({
    conversation_id: conversation.id,
    sender_type: "customer",
    sender_id: callerId,
    text: text || "Sent a message",
  })

  return res.json({ message })
}
