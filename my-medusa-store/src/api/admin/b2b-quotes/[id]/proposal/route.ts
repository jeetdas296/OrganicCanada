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
    fields: ["id", "metadata", "items.*", "items.product_id"],
    filters: { id: targetQuoteId },
  })

  const order = orders?.[0]
  if (!order || order.metadata?.is_b2b_quote !== true) {
    return res.status(404).json({ message: "B2B Quote not found" })
  }

  // Determine if the caller is a Vendor
  let authenticatedVendorId: string | null = null
  if (callerId && callerId !== "admin") {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: callerId }
    })
    if (users.length > 0 && users[0].vendor?.id) {
      authenticatedVendorId = users[0].vendor.id
    } else {
      try {
        const { data: vendors } = await query.graph({
          entity: "vendor",
          fields: ["id"],
          filters: { user_id: callerId }
        })
        if (vendors.length > 0 && vendors[0].id) {
          authenticatedVendorId = vendors[0].id
        }
      } catch (e) {}
    }
  }

  try {
    const body = req.body as any

    if (authenticatedVendorId) {
      // Vendor Flow: strip global fields
      delete body.shipping_option_id
      delete body.shipping_price
      delete body.promotion_code
      delete body.discount_percentage
      delete body.fixed_discount
      delete body.note

      if (body.action === "approve") {
        return res.status(403).json({ message: "Forbidden: Vendors cannot approve B2B quotes." })
      }

      // Pre-fetch all products to check ownership
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"]
      })
      const vendorProductIds = products.filter((p: any) => p.vendor?.id === authenticatedVendorId).map((p: any) => p.id)

      if (body.items_to_update && body.items_to_update.length > 0) {
        for (const update of body.items_to_update) {
          const lineItem = order.items?.find((i: any) => i.id === update.id)
          if (!lineItem) return res.status(400).json({ message: `Line item ${update.id} not found in quote` })
          if (!vendorProductIds.includes(lineItem.product_id)) {
            return res.status(403).json({ message: "Forbidden: You cannot modify another vendor's products" })
          }
        }
      }

      if (body.items_to_remove && body.items_to_remove.length > 0) {
        for (const remove of body.items_to_remove) {
          const lineItem = order.items?.find((i: any) => i.id === remove.id)
          if (!lineItem) return res.status(400).json({ message: `Line item ${remove.id} not found in quote` })
          if (!vendorProductIds.includes(lineItem.product_id)) {
            return res.status(403).json({ message: "Forbidden: You cannot remove another vendor's products" })
          }
        }
      }

      if (body.items_to_add && body.items_to_add.length > 0) {
        for (const add of body.items_to_add) {
          if (!add.variant_id) return res.status(400).json({ message: "Variant ID required when adding items" })
          const { data: variants } = await query.graph({
            entity: "variant",
            fields: ["id", "product.id"],
            filters: { id: add.variant_id }
          })
          const variant = variants?.[0]
          if (!variant || !vendorProductIds.includes(variant.product?.id)) {
            return res.status(403).json({ message: "Forbidden: You cannot add another vendor's products" })
          }
        }
      }
    }

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
      messages: result.messages,
      structured_diff: result.structured_diff,
    })
  } catch (error: any) {
    console.error("Admin Proposal update/approve error:", error)
    return res.status(error.status || 400).json({
      message: error.message || "Failed to update Proposal Agreement",
    })
  }
}
