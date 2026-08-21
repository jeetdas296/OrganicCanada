import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../../../modules/company"
import { resolveConversationId } from "../../../../../modules/company/utils/resolve-conversation-id"

async function getVendorIdForUser(req: MedusaRequest, userId: string): Promise<string | null> {
  const query = req.scope.resolve("query")

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "vendor.*"],
    filters: { id: userId }
  })
  if (users.length > 0 && users[0].vendor?.id) return users[0].vendor.id

  try {
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id"],
      filters: { user_id: userId }
    })
    if (vendors.length > 0 && vendors[0].id) return vendors[0].id
  } catch (e) { }

  return null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const companyService = req.scope.resolve(COMPANY_MODULE)
  const query = req.scope.resolve("query")

  const targetQuoteId = await resolveConversationId(id, query)
  const userId = (req as any).auth_context?.actor_id

  let vendorId: string | null = null
  if (userId) {
    vendorId = await getVendorIdForUser(req, userId)
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "items.*", "items.product_id"],
    filters: { id }
  })

  const draftOrder = orders?.[0]
  if (!draftOrder) {
    return res.status(404).json({ message: "Quote not found" })
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

  if (vendorId) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)
    const hasProductInQuote = draftOrder.items?.some((item: any) => vendorProductIds.includes(item.product_id))

    if (!hasProductInQuote) {
      return res.status(403).json({ message: "Forbidden: Vendor has no products in this quote" })
    }
  }

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

  if (conversation && conversation.messages) {
    // Map proposal_diff to metadata for frontend compatibility
    conversation.messages = conversation.messages.map((m: any) => {
      if (m.proposal_diff && m.proposal_diff.vendor_id) {
        m.metadata = { vendor_id: m.proposal_diff.vendor_id, ...(m.metadata || {}) }
      }
      return m
    })

    if (vendorId) {
      conversation.messages = conversation.messages.filter((m: any) => m.metadata?.vendor_id === vendorId)
    }
  }

  return res.json({
    conversation: conversation || null,
    order_status: draftOrder?.status,
    vendor_tabs: Array.from(vendorTabsMap.values()),
    vendor_id: vendorId
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { text, price_proposal, attachment_url, vendor_id, action } = req.body as any
  const companyService = req.scope.resolve(COMPANY_MODULE)
  const query = req.scope.resolve("query")

  const targetQuoteId = await resolveConversationId(id, query)
  const userId = (req as any).auth_context?.actor_id

  let authenticatedVendorId: string | null = null
  if (userId) {
    authenticatedVendorId = await getVendorIdForUser(req, userId)
  }

  // Prevent Vendor from doing anything global like final_accept
  if (authenticatedVendorId && action === "final_accept") {
    return res.status(403).json({ message: "Forbidden: Vendor cannot finalize quote." })
  }

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id },
    fields: ["id", "customer_id", "metadata", "items.*", "items.product_id"]
  })
  const currentOrder = orders?.[0]
  if (!currentOrder) {
    return res.status(404).json({ message: "Quote not found" })
  }

  let finalVendorId: string | null = null

  if (authenticatedVendorId) {
    // 1. Vendor Flow: Force their vendor ID, ignore body, validate they own a product
    finalVendorId = authenticatedVendorId

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => p.vendor?.id === finalVendorId).map((p: any) => p.id)
    const hasProductInQuote = currentOrder.items?.some((item: any) => vendorProductIds.includes(item.product_id))

    if (!hasProductInQuote) {
      return res.status(403).json({ message: "Forbidden: Vendor has no products in this quote" })
    }
  } else if (vendor_id) {
    // 2. Admin Flow targeting a specific vendor: Validate vendor owns a product
    finalVendorId = vendor_id

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.*"]
    })
    const vendorProductIds = products.filter((p: any) => finalVendorId === "admin" ? !p.vendor?.id : p.vendor?.id === finalVendorId).map((p: any) => p.id)
    const hasProductInQuote = currentOrder.items?.some((item: any) => vendorProductIds.includes(item.product_id))

    if (!hasProductInQuote) {
      return res.status(403).json({ message: "Forbidden: Specified vendor has no products in this quote" })
    }
  }

  // Find or create conversation
  let [conversation] = await companyService.listQuoteConversations({ quote_id: targetQuoteId })

  if (!conversation) {
    const company = currentOrder.customer_id ? await companyService.getCompanyForCustomer(currentOrder.customer_id, query) : null

    conversation = await companyService.createQuoteConversations({
      quote_id: targetQuoteId,
      company_id: company?.id || currentOrder.customer_id || "unknown",
      status: "open",
    })
  }

  if (conversation.status === "closed" || ["ready_for_payment", "payment_pending", "paid", "completed", "accepted"].includes(currentOrder.metadata?.quote_status as string)) {
    return res.status(400).json({ message: "Negotiation is locked/closed" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)

  // Handle Accept / Reject
  if ((action === "accept" || action === "reject") && finalVendorId) {
    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED"
    const vendorStatuses = (currentOrder.metadata?.vendor_statuses as any) || {}
    const vendorLastSender = (currentOrder.metadata?.vendor_last_sender as any) || {}

    if (action === "accept" && vendorLastSender[finalVendorId] !== "customer") {
      return res.status(400).json({ message: "You cannot accept your own proposal. Waiting for customer." })
    }

    if (vendorStatuses[finalVendorId] === newStatus) {
      return res.status(400).json({ message: `Vendor is already ${newStatus}` })
    }

    await orderModule.updateOrders([{
      id: currentOrder.id,
      metadata: {
        ...(currentOrder.metadata || {}),
        vendor_statuses: {
          ...vendorStatuses,
          [finalVendorId]: newStatus
        }
      }
    }])

    const messageText = action === "accept"
      ? `✅ Vendor accepted the proposal.`
      : `❌ Vendor rejected the proposal.`

    const message = await companyService.createQuoteMessages({
      conversation_id: conversation.id,
      sender_type: "admin",
      sender_id: userId || "admin",
      text: messageText,
      proposal_diff: { vendor_id: finalVendorId }
    })

    return res.json({ message, vendor_status: newStatus })
  }

  const messagePayload: any = {
    conversation_id: conversation.id,
    sender_type: "admin",
    sender_id: userId || "admin",
    text,
    price_proposal,
    attachment_url,
  }

  if (finalVendorId) {
    messagePayload.proposal_diff = { vendor_id: finalVendorId }
  }

  const message = await companyService.createQuoteMessages(messagePayload)

  if (currentOrder) {
    await orderModule.updateOrders([{
      id: currentOrder.id,
      metadata: {
        ...(currentOrder.metadata || {}),
        quote_status: "negotiating",
        ...(price_proposal != null && !finalVendorId ? { counter_price: price_proposal } : {}),
      }
    }])
  }

  return res.json({ message })
}

