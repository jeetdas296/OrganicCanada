import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createOrUpdateOrderPaymentCollectionWorkflow, updateDraftOrderItemWorkflow } from "@medusajs/core-flows"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id

  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  // 1. Validate Draft Order belongs to caller
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "metadata", "status", "items.*", "items.product_id"],
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

  // Calculate Vendor Tabs
  const vendorTabsMap = new Map<string, any>()
  const items = draftOrder.items || []
  if (items.length > 0) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    
    items.forEach((item: any) => {
      const p = products.find((prod: any) => prod.id === item.product_id)
      if (p?.vendor?.id) {
        vendorTabsMap.set(p.vendor.id, {
          id: p.vendor.id,
          name: p.vendor.name || "Vendor"
        })
      }
    })
  }

  let [conversation] = await companyService.listQuoteConversations(
    { quote_id: targetQuoteId },
    { relations: ["messages"] }
  )

  if (conversation && conversation.messages) {
    // Map proposal_diff to metadata for frontend compatibility
    conversation.messages = conversation.messages.map((m: any) => {
      if (m.proposal_diff && m.proposal_diff.vendor_id) {
        m.metadata = { vendor_id: m.proposal_diff.vendor_id, ...(m.metadata || {}) }
      }
      return m
    })
  }

  if (conversation && conversation.status !== "closed" && (draftOrder.status === "completed" || draftOrder.status === "canceled")) {
    conversation = await companyService.updateQuoteConversations({
      id: conversation.id,
      status: "closed"
    })
  }

  return res.json({
    conversation: conversation || null,
    order_status: draftOrder.status,
    quote_status: draftOrder.metadata?.quote_status || "pending",
    order_total: Number(draftOrder.total || 0),
    vendor_tabs: Array.from(vendorTabsMap.values())
  })
}


export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { text, action, vendor_id } = req.body as any
  const query = req.scope.resolve("query")
  const targetQuoteId = await resolveConversationId(id, query)

  // 1. Validate Draft Order belongs to caller
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "metadata", "items.*", "items.product_id"],
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
  
  let validVendorId: string | null = null

  if (vendor_id && action !== "final_accept") {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendor_id).map((p: any) => p.id)
    const hasProductInQuote = draftOrder.items?.some((item: any) => vendorProductIds.includes(item.product_id))
    
    if (!hasProductInQuote) {
      return res.status(403).json({ message: "Forbidden: Vendor has no products in this quote" })
    }
    validVendorId = vendor_id
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

  if (conversation.status === "closed" || ["ready_for_payment", "payment_pending", "paid", "completed", "accepted"].includes(draftOrder.metadata?.quote_status as string)) {
    return res.status(400).json({ message: "Negotiation is locked/closed" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)

  // 3. Handle Vendor-Scoped Accept/Reject
  if ((action === "accept" || action === "reject") && validVendorId) {
    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED"
    const vendorStatuses = (draftOrder.metadata?.vendor_statuses as any) || {}
    const vendorLastSender = (draftOrder.metadata?.vendor_last_sender as any) || {}

    if (action === "accept" && vendorLastSender[validVendorId] === "customer") {
      return res.status(400).json({ message: "You cannot accept your own proposal. Waiting for vendor." })
    }

    if (vendorStatuses[validVendorId] === newStatus) {
      return res.status(400).json({ message: `Vendor is already ${newStatus}` })
    }

    await orderModule.updateOrders([{
      id: draftOrder.id,
      metadata: {
        ...(draftOrder.metadata || {}),
        vendor_statuses: {
          ...vendorStatuses,
          [validVendorId]: newStatus
        }
      }
    }])

    const messageText = action === "accept" 
      ? `✅ Customer accepted Vendor's proposal.`
      : `❌ Customer rejected Vendor's proposal.`

    const message = await companyService.createQuoteMessages({
      conversation_id: conversation.id,
      sender_type: "customer",
      sender_id: callerId,
      text: messageText,
      proposal_diff: { vendor_id: validVendorId }
    })

    return res.json({ message, vendor_status: newStatus })
  }

  // 4. Handle Global Final Accept
  if (action === "final_accept" || (action === "accept" && !validVendorId)) {
    // A. Verify all vendors are resolved
    const quoteVendors = new Set<string>()
    for (const item of draftOrder.items || []) {
      if (!item || !item.product_id) continue
      const { data: products } = await query.graph({ entity: "product", fields: ["id", "vendor.*"] })
      const vId = products.find((p: any) => p.id === item.product_id)?.vendor?.id
      if (vId) quoteVendors.add(vId)
    }

    const vendorStatuses = (draftOrder.metadata?.vendor_statuses as any) || {}
    const rejectedVendors = new Set<string>()

    for (const vId of quoteVendors) {
      const st = vendorStatuses[vId]
      if (st !== "ACCEPTED" && st !== "REJECTED") {
        return res.status(400).json({ message: `Cannot finalize. Vendor ${vId} is not resolved (${st || "NEGOTIATING"}).` })
      }
      if (st === "REJECTED") {
        rejectedVendors.add(vId)
      }
    }

    // B. Exclude Rejected Vendors from the Draft Order
    if (rejectedVendors.size > 0) {
      const itemsToZero: { id: string; quantity: number }[] = []
      for (const item of draftOrder.items || []) {
        if (!item || !item.product_id) continue
        const { data: products } = await query.graph({ entity: "product", fields: ["id", "vendor.*"] })
        const vId = products.find((p: any) => p.id === item.product_id)?.vendor?.id
        if (vId && rejectedVendors.has(vId)) {
          itemsToZero.push({ id: item.id, quantity: 0 })
        }
      }

      if (itemsToZero.length > 0) {
        await updateDraftOrderItemWorkflow(req.scope).run({
          input: {
            order_id: draftOrder.id,
            items: itemsToZero
          }
        })
      }
    }

    // C. Lock Negotiation & Prepare Payment
    conversation = await companyService.updateQuoteConversations({
      id: conversation.id,
      status: "agreement_reached"
    })

    // Fetch the updated order to get the correct total
    const { data: updatedOrders } = await query.graph({
      entity: "order",
      fields: ["total"],
      filters: { id: draftOrder.id }
    })
    const finalOrder = updatedOrders?.[0] || draftOrder
    const orderTotal = Number(
      typeof finalOrder.total === "object" && finalOrder.total !== null
        ? (finalOrder.total as any).numeric ?? finalOrder.total
        : finalOrder.total || 0
    )

    await orderModule.updateOrders([{
      id: draftOrder.id,
      metadata: {
        ...(draftOrder.metadata || {}),
        quote_status: "ready_for_payment",
      }
    }])

    try {
      await createOrUpdateOrderPaymentCollectionWorkflow(req.scope).run({
        input: {
          order_id: draftOrder.id,
          amount: orderTotal,
        }
      })
    } catch (e: any) {
      console.error("Payment collection workflow note:", e.message)
    }

    const message = await companyService.createQuoteMessages({
      conversation_id: conversation.id,
      sender_type: "customer",
      sender_id: callerId,
      text: "✅ Customer accepted the final RFQ. Negotiation is locked.",
      proposal_diff: { vendor_id: null }
    })

    return res.json({ conversation, message, quote_status: "ready_for_payment", order_total: orderTotal })
  }

  // 5. Handle standard chat messages
  const messagePayload: any = {
    conversation_id: conversation.id,
    sender_type: "customer",
    sender_id: callerId,
    text: text || "Sent a message",
  }
  
  if (validVendorId) {
    messagePayload.proposal_diff = { vendor_id: validVendorId }
  }

  const message = await companyService.createQuoteMessages(messagePayload)

  if (draftOrder.metadata?.quote_status === "pending") {
    await orderModule.updateOrders([{
      id: draftOrder.id,
      metadata: {
        ...(draftOrder.metadata || {}),
        quote_status: "negotiating",
      }
    }])
  }

  return res.json({ message })
}
