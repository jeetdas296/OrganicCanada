// src/api/admin/b2b-quotes/[id]/counter-offer/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { price_proposal, text } = req.body as { price_proposal?: number; text?: string }

  const query = req.scope.resolve("query")
  const orderModule = req.scope.resolve(Modules.ORDER)
  const companyService = req.scope.resolve(COMPANY_MODULE)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id },
      fields: ["id", "customer_id", "metadata", "total"],
    })

    const order = orders?.[0]
    if (!order) {
      return res.status(404).json({ message: "Draft Order (Quote) not found" })
    }

    const targetQuoteId = await resolveConversationId(id, query)

    let [conversation] = await companyService.listQuoteConversations({
      quote_id: targetQuoteId,
    })

    if (!conversation) {
      const company = order.customer_id
        ? await companyService.getCompanyForCustomer(order.customer_id, query)
        : null

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
      text: text || `Proposed a counter price of ${price_proposal}`,
      price_proposal: price_proposal ?? null,
    })

    const approvedPrice = price_proposal ?? Number(order.total)

    const [updatedOrder] = await orderModule.updateOrders([
      {
        id: order.id,
        metadata: {
          ...(order.metadata || {}),
          quote_status: "approved",
          approved_price: approvedPrice,
          counter_price: approvedPrice,
          approved_by: (req as any).auth_context?.actor_id || "admin",
          approved_at: new Date().toISOString(),
        },
      },
    ])

    return res.json({
      message: "Counter offer submitted and quote approved successfully",
      message_record: message,
      order: updatedOrder,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to submit counter offer",
      error: error.message,
    })
  }
}
