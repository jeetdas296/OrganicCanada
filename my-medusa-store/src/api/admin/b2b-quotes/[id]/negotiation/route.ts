import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const companyService = req.scope.resolve(COMPANY_MODULE)

  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status"],
    filters: { id }
  })
  
  const draftOrder = orders?.[0]

  let [conversation] = await companyService.listQuoteConversations(
    { quote_id: targetQuoteId },
    { relations: ["messages"] }
  )

  // Valid Medusa order statuses: 'pending' | 'draft' | 'canceled' | 'archived' | 'requires_action'
  if (conversation && conversation.status !== "closed" && (draftOrder?.status === "completed" || draftOrder?.status === "canceled")) {
    conversation = await companyService.updateQuoteConversations({
      id: conversation.id,
      status: "closed"
    })
  }

  return res.json({ 
    conversation: conversation || null,
    order_status: draftOrder?.status
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { text, price_proposal, attachment_url } = req.body as any
  const companyService = req.scope.resolve(COMPANY_MODULE)

  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  // Find or create conversation
  let [conversation] = await companyService.listQuoteConversations({ quote_id: targetQuoteId })

  if (!conversation) {
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id },
      fields: ["id", "customer_id"]
    })
    const order = orders?.[0]
    if (!order) {
      return res.status(404).json({ message: "Quote not found" })
    }

    const company = order.customer_id ? await companyService.getCompanyForCustomer(order.customer_id, query) : null

    conversation = await companyService.createQuoteConversations({
      quote_id: targetQuoteId,
      company_id: company?.id || order.customer_id || "unknown",
      status: "open",
    })
  }

  if (conversation.status === "closed") {
    return res.status(400).json({ message: "Negotiation is closed" })
  }

  const message = await companyService.createQuoteMessages({
    conversation_id: conversation.id,
    sender_type: "admin",
    sender_id: (req as any).auth_context?.actor_id || "admin",
    text,
    price_proposal,
    attachment_url,
  })

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id },
    fields: ["id", "metadata"],
  })
  const currentOrder = orders?.[0]
  if (currentOrder) {
    const orderModule = req.scope.resolve(Modules.ORDER)
    await orderModule.updateOrders([{
      id: currentOrder.id,
      metadata: {
        ...(currentOrder.metadata || {}),
        quote_status: "negotiating",
        ...(price_proposal != null ? { counter_price: price_proposal } : {}),
      }
    }])
  }

  return res.json({ message })
}

