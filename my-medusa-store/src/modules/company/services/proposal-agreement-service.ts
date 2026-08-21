import {
  beginDraftOrderEditWorkflow,
  confirmDraftOrderEditWorkflow,
  updateDraftOrderItemWorkflow,
  addDraftOrderItemsWorkflow,
  addDraftOrderShippingMethodsWorkflow,
  updateDraftOrderShippingMethodWorkflow,
  updateDraftOrderWorkflow,
  addDraftOrderPromotionWorkflow,
} from "@medusajs/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../index"
import { resolveConversationId } from "../utils/resolve-conversation-id"

export interface ProposalModificationInput {
  items_to_update?: Array<{ id: string; quantity?: number; unit_price?: number }>
  items_to_add?: Array<{ variant_id: string; quantity: number; unit_price?: number; title?: string }>
  items_to_remove?: Array<{ id: string }>
  shipping_option_id?: string
  shipping_price?: number
  note?: string
  discount_percentage?: number
  fixed_discount?: number
  promotion_code?: string
}

export interface UpdateProposalAgreementOptions {
  orderId: string
  actorId: string
  senderType: "admin" | "customer"
  changes: ProposalModificationInput
  scope: any
}

export class ProposalAgreementService {
  /**
   * Checks if a B2B Quote Draft Order is currently locked for proposal editing.
   */
  static isQuoteLocked(quoteStatus?: string): boolean {
    const lockedStatuses = [
      "ready_for_payment",
      "payment_pending",
      "paid",
      "completed",
      "accepted",
    ]
    return !!quoteStatus && lockedStatuses.includes(quoteStatus)
  }

  /**
   * Formats a Medusa BigNumber / currency object into a clean numeric string.
   */
  static parseNumber(value: any): number {
    if (value === null || value === undefined) return 0
    if (typeof value === "object") {
      return Number(value.numeric ?? value.value ?? 0)
    }
    return Number(value || 0)
  }

  static formatMoney(amount: number, currencyCode: string = "USD"): string {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode.toUpperCase(),
      }).format(amount)
    } catch {
      return `$${amount.toFixed(2)}`
    }
  }

  /**
   * Shared Product Search service method for Admin and Storefront Proposal Agreement.
   * Searches variants by Product Name, Variant Name, or SKU.
   */
  static async searchCatalogProducts(
    query: string,
    currencyCode: string = "USD",
    scope: any,
    options?: { quoteId?: string; customerId?: string; vendorId?: string }
  ): Promise<{
    variants: Array<{
      variant_id: string
      product_title: string
      variant_title: string
      sku: string
      inventory_quantity: number
      unit_price: number
      thumbnail: string
    }>
  }> {
    const queryService = scope.resolve("query")
    const cleanQ = (query || "").trim().toLowerCase()

    let resolvedCurrency = currencyCode
    let resolvedCustomerId = options?.customerId
    let resolvedRegionId: string | undefined
    let resolvedSalesChannelId: string | undefined
    let resolvedCompanyId: string | undefined
    let resolvedCustomerEmail: string | undefined

    // 1. Resolve B2B Quote context if quoteId is provided
    if (options?.quoteId) {
      try {
        const { data: quotes } = await queryService.graph({
          entity: "order",
          fields: [
            "id",
            "customer_id",
            "email",
            "currency_code",
            "region_id",
            "sales_channel_id",
            "metadata",
          ],
          filters: { id: options.quoteId },
        })
        const qObj = quotes?.[0]
        if (qObj) {
          if (qObj.customer_id) resolvedCustomerId = qObj.customer_id
          if (!resolvedCustomerId && qObj.metadata?.b2b_customer_id) {
            resolvedCustomerId = String(qObj.metadata.b2b_customer_id)
          }
          if (qObj.email) resolvedCustomerEmail = qObj.email
          if (qObj.currency_code) resolvedCurrency = qObj.currency_code
          if (qObj.region_id) resolvedRegionId = qObj.region_id
          if (qObj.sales_channel_id) resolvedSalesChannelId = qObj.sales_channel_id
          if (qObj.metadata?.company_id) resolvedCompanyId = String(qObj.metadata.company_id)
          if (!resolvedCompanyId && qObj.metadata?.b2b_company_id) {
            resolvedCompanyId = String(qObj.metadata.b2b_company_id)
          }
        }
      } catch (e: any) {
        console.warn("[searchCatalogProducts] Could not fetch quote context:", e.message)
      }
    }

    if (!resolvedCustomerId && resolvedCustomerEmail) {
      try {
        const { data: matchedCustomers } = await queryService.graph({
          entity: "customer",
          fields: ["id"],
          filters: { email: resolvedCustomerEmail },
        })
        if (matchedCustomers?.[0]?.id) {
          resolvedCustomerId = matchedCustomers[0].id
        }
      } catch (e: any) {
        // ignore
      }
    }

    // 2. Resolve B2B Customer Groups and Company ID for accurate price list / B2B pricing calculation
    let customerGroupIds: string[] = []
    if (resolvedCustomerId) {
      try {
        const { data: customers } = await queryService.graph({
          entity: "customer",
          fields: ["id", "groups.*", "metadata"],
          filters: { id: resolvedCustomerId },
        })
        const cObj = customers?.[0]
        if (cObj?.groups) {
          customerGroupIds = cObj.groups.map((g: any) => g.id).filter(Boolean)
        }
        if (!resolvedCompanyId && cObj?.metadata?.company_id) {
          resolvedCompanyId = String(cObj.metadata.company_id)
        }
      } catch (e: any) {
        console.warn("[searchCatalogProducts] Could not fetch customer groups:", e.message)
      }
    }

    // Medusa V2 Price List & Price Rule engine matches against dot-syntax attributes ("customer.groups.id", "customer.id", "region.id", "sales_channel.id") as well as underscore syntax
    const pricingContext: Record<string, any> = {
      currency_code: resolvedCurrency.toLowerCase(),
    }
    if (resolvedRegionId) {
      pricingContext.region_id = resolvedRegionId
      pricingContext["region.id"] = resolvedRegionId
    }
    if (resolvedSalesChannelId) {
      pricingContext.sales_channel_id = resolvedSalesChannelId
      pricingContext["sales_channel.id"] = resolvedSalesChannelId
    }
    if (resolvedCustomerId) {
      pricingContext.customer_id = resolvedCustomerId
      pricingContext["customer.id"] = resolvedCustomerId
    }
    if (customerGroupIds.length > 0) {
      pricingContext.customer_group_id = customerGroupIds
      pricingContext["customer.groups.id"] = customerGroupIds
    }
    if (resolvedCompanyId) {
      pricingContext.company_id = resolvedCompanyId
      pricingContext["company.id"] = resolvedCompanyId
    }

    try {
      const { data: variants } = await queryService.graph({
        entity: "variant",
        fields: [
          "id",
          "title",
          "sku",
          "inventory_quantity",
          "inventory_items.*",
          "prices.*",
          "product.id",
          "product.title",
          "product.thumbnail",
          "product.images.*",
          "product.vendor.*",
        ],
        pagination: {
          take: 500,
        },
      })

      const matching = (variants || []).filter((v: any) => {
        if (options?.vendorId && v.product?.vendor?.id !== options.vendorId) {
          return false
        }
        if (!cleanQ) return true
        const pTitle = (v.product?.title || "").toLowerCase()
        const vTitle = (v.title || "").toLowerCase()
        const sku = (v.sku || "").toLowerCase()
        return pTitle.includes(cleanQ) || vTitle.includes(cleanQ) || sku.includes(cleanQ)
      }).slice(0, 30)

      // 3. Resolve actual sellable available inventory across all locations
      const invItemIds = Array.from(new Set(
        matching.flatMap((v: any) =>
          (v.inventory_items || []).map((ii: any) => ii.inventory_item_id || ii.id).filter(Boolean)
        )
      ))
      const inventoryMap = new Map<string, number>()
      if (invItemIds.length > 0) {
        try {
          const { data: invItems } = await queryService.graph({
            entity: "inventory_item",
            fields: ["id", "location_levels.*"],
            filters: { id: invItemIds },
          })
          for (const item of invItems || []) {
            let totalAvail = 0
            for (const level of (item as any)?.location_levels || []) {
              const avail = level?.available_quantity !== undefined && level?.available_quantity !== null
                ? Number(level.available_quantity)
                : Math.max(0, Number(level?.stocked_quantity || 0) - Number(level?.reserved_quantity || 0))
              if (!isNaN(avail)) {
                totalAvail += avail
              }
            }
            inventoryMap.set(item.id, totalAvail)
          }
        } catch (err: any) {
          console.error("[searchCatalogProducts] Error querying inventory levels:", err.message)
        }
      }

      // 4. Resolve B2B Pricing using Medusa V2 Native Pricing Engine (pricingService.calculatePrices)
      const priceSetIds = Array.from(new Set(
        matching.map((v: any) => v.prices?.[0]?.price_set_id || (v.prices || []).find((p: any) => p.price_set_id)?.price_set_id).filter(Boolean)
      ))
      const priceMap = new Map<string, number>()
      try {
        const pricingService = scope.resolve("pricing")
        if (priceSetIds.length > 0 && pricingService) {
          const calculatedPrices = await pricingService.calculatePrices(
            { id: priceSetIds },
            {
              context: pricingContext,
            }
          )
          for (const calc of calculatedPrices || []) {
            if (calc?.id && calc.calculated_amount !== undefined && calc.calculated_amount !== null) {
              priceMap.set(calc.id, Number(calc.calculated_amount))
            }
          }
        }
      } catch (err: any) {
        console.warn("[searchCatalogProducts] Could not calculate prices via pricingService:", err.message)
      }

      const formatted = matching.map((v: any) => {
        // A) Inventory across locations
        let availableQty = 0
        for (const ii of (v.inventory_items || [])) {
          const iiId = ii.inventory_item_id || ii.id
          if (iiId && inventoryMap.has(iiId)) {
            availableQty += inventoryMap.get(iiId) || 0
          }
        }
        if (availableQty === 0 && Number(v.inventory_quantity || 0) > 0) {
          availableQty = Number(v.inventory_quantity)
        }

        // B) B2B Price from Medusa native pricing engine
        let unitPrice = 0
        const priceSetId = v.prices?.[0]?.price_set_id || (v.prices || []).find((p: any) => p.price_set_id)?.price_set_id
        if (priceSetId && priceMap.has(priceSetId)) {
          unitPrice = priceMap.get(priceSetId) || 0
        } else {
          const matchingPrice = (v.prices || []).find(
            (p: any) => p.currency_code?.toLowerCase() === resolvedCurrency.toLowerCase()
          ) || v.prices?.[0]
          unitPrice = matchingPrice ? Number(matchingPrice.amount) : 0
        }

        const thumb = v.product?.thumbnail || v.product?.images?.[0]?.url || "/img/1.png"

        return {
          variant_id: v.id,
          product_title: v.product?.title || "Product",
          variant_title: v.title || "Default",
          sku: v.sku || "",
          inventory_quantity: availableQty,
          unit_price: unitPrice,
          thumbnail: thumb,
        }
      })

      return { variants: formatted }
    } catch (err: any) {
      console.error("[ProposalAgreementService] Error searching catalog products:", err)
      return { variants: [] }
    }
  }

  /**
   * Unified entry point to update a Proposal Agreement, batching edits into a single Medusa Draft Order session.
   */
  static async updateProposalAgreement({
    orderId,
    actorId,
    senderType,
    changes,
    scope,
  }: UpdateProposalAgreementOptions) {
    const query = scope.resolve("query")
    const companyService = scope.resolve(COMPANY_MODULE)

    // 1. Retrieve current Order & Before State
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "customer_id",
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
      filters: { id: orderId },
    })

    const order = orders?.[0]
    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Draft Order not found")
    }

    const quoteStatus = order.metadata?.quote_status as string | undefined
    if (this.isQuoteLocked(quoteStatus)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Proposal Agreement is locked (${quoteStatus}) and cannot be modified.`
      )
    }

    const oldTotal = this.parseNumber(order.total)
    const beforeItemsMap = new Map<string, { title: string; quantity: number; unit_price: number }>()
    for (const item of order.items || []) {
      beforeItemsMap.set(item.id, {
        title: item.title || "Item",
        quantity: item.quantity || 0,
        unit_price: this.parseNumber(item.unit_price),
      })
    }

    // 2. Open a single batch Draft Order edit session
    const { result: preview } = await beginDraftOrderEditWorkflow(scope).run({
      input: { order_id: orderId },
    })

    // Initialize Vendor Scopes
    const vendorScopes = new Map<string | null, { diffEntries: string[], structuredDiff: Record<string, any> }>()
    const getScope = (vId: string | null) => {
      if (!vendorScopes.has(vId)) {
        vendorScopes.set(vId, {
          diffEntries: [],
          structuredDiff: { vendor_id: vId, old_total: oldTotal, new_total: oldTotal, changed_items: [] }
        })
      }
      return vendorScopes.get(vId)!
    }
    const { data: products } = await query.graph({ entity: "product", fields: ["id", "vendor.*"] })
    const getVendorId = (productId: string | undefined) => {
      return products.find((p: any) => p.id === productId)?.vendor?.id || "admin"
    }

    // 3. Execute requested item updates
    if (changes.items_to_update && changes.items_to_update.length > 0) {
      for (const itemUpdate of changes.items_to_update) {
        const before = beforeItemsMap.get(itemUpdate.id)
        await updateDraftOrderItemWorkflow(scope).run({
          input: {
            order_id: orderId,
            items: [
              {
                id: itemUpdate.id,
                quantity: itemUpdate.quantity ?? before?.quantity ?? 1,
                unit_price: itemUpdate.unit_price ?? before?.unit_price ?? 0,
              },
            ],
          },
        })

        if (before) {
          const lineItem = order.items?.find((i: any) => i.id === itemUpdate.id)
          const vId = getVendorId(lineItem?.product_id)
          const vendorScope = getScope(vId)

          const qtyChange = itemUpdate.quantity !== undefined && itemUpdate.quantity !== before.quantity
            ? `Qty: ${before.quantity} → ${itemUpdate.quantity}`
            : ""
          const priceChange = itemUpdate.unit_price !== undefined && itemUpdate.unit_price !== before.unit_price
            ? `Price: ${this.formatMoney(before.unit_price, order.currency_code)} → ${this.formatMoney(itemUpdate.unit_price, order.currency_code)}`
            : ""
          const desc = [qtyChange, priceChange].filter(Boolean).join(" | ")
          if (desc) {
            vendorScope.diffEntries.push(`• ${before.title}: ${desc}`)
            vendorScope.structuredDiff.changed_items.push({
              item_id: itemUpdate.id,
              title: before.title,
              old_quantity: before.quantity,
              new_quantity: itemUpdate.quantity ?? before.quantity,
              old_price: before.unit_price,
              new_price: itemUpdate.unit_price ?? before.unit_price,
            })
          }
        }
      }
    }

    // 4. Execute requested item additions
    if (changes.items_to_add && changes.items_to_add.length > 0) {
      for (const addItem of changes.items_to_add) {
        let variant: any = null
        if (addItem.variant_id) {
          const { data: variants } = await query.graph({
            entity: "variant",
            fields: ["id", "title", "sku", "barcode", "product.*"],
            filters: { id: addItem.variant_id },
          })
          variant = variants?.[0]
        }

        await addDraftOrderItemsWorkflow(scope).run({
          input: {
            order_id: orderId,
            items: [
              {
                variant_id: addItem.variant_id,
                quantity: addItem.quantity,
                unit_price: addItem.unit_price ?? 0,
                title: addItem.title || variant?.product?.title || "Custom Item",
                thumbnail: variant?.product?.thumbnail,
                product_title: variant?.product?.title,
                product_description: variant?.product?.description,
                product_subtitle: variant?.product?.subtitle,
                product_type: variant?.product?.type?.value,
                product_collection: variant?.product?.collection?.title,
                product_handle: variant?.product?.handle,
                variant_sku: variant?.sku,
                variant_barcode: variant?.barcode,
                variant_title: variant?.title,
                product_id: variant?.product?.id,
              } as any,
            ],
          },
        })
        const vId = getVendorId(variant?.product?.id)
        const vendorScope = getScope(vId)

        vendorScope.diffEntries.push(`• Added Item: ${addItem.title || `Variant (${addItem.variant_id})`} x${addItem.quantity}`)
        vendorScope.structuredDiff.changed_items.push({
          action: "added",
          variant_id: addItem.variant_id,
          quantity: addItem.quantity,
        })
      }
    }

    // 4.5 Execute requested item removals
    if (changes.items_to_remove && changes.items_to_remove.length > 0) {
      for (const removeItem of changes.items_to_remove) {
        const before = beforeItemsMap.get(removeItem.id)
        await updateDraftOrderItemWorkflow(scope).run({
          input: {
            order_id: orderId,
            items: [
              {
                id: removeItem.id,
                quantity: 0,
                unit_price: before?.unit_price ?? 0,
              },
            ],
          },
        })
        if (before) {
          const lineItem = order.items?.find((i: any) => i.id === removeItem.id)
          const vId = getVendorId(lineItem?.product_id)
          const vendorScope = getScope(vId)

          vendorScope.diffEntries.push(`• Removed Item: ${before.title}`)
          vendorScope.structuredDiff.changed_items.push({
            action: "removed",
            item_id: removeItem.id,
            title: before.title,
            old_quantity: before.quantity,
            new_quantity: 0,
          })
        }
      }
    }

    // 4.7 Execute shipping option / price updates
    const globalScope = getScope(null)

    if (changes.shipping_option_id) {
      await addDraftOrderShippingMethodsWorkflow(scope).run({
        input: {
          order_id: orderId,
          shipping_option_id: changes.shipping_option_id,
          custom_amount: changes.shipping_price,
        },
      })
      globalScope.diffEntries.push(`• Shipping Method Updated`)
      globalScope.structuredDiff.shipping_changed = true
    }

    // 4.8 Execute promotion code / discounts
    if (changes.promotion_code) {
      await addDraftOrderPromotionWorkflow(scope).run({
        input: {
          order_id: orderId,
          promo_codes: [changes.promotion_code],
        },
      })
      globalScope.diffEntries.push(`• Applied Promo Code: ${changes.promotion_code}`)
      globalScope.structuredDiff.promotion_applied = changes.promotion_code
    }

    // 5. Execute Note / Terms and Discount Metadata update, and always reset admin_offer_approved
    const oldNote = (order.metadata?.proposal_note as string) || "None"

    const metadataUpdate: any = {
      ...(order.metadata || {}),
      admin_offer_approved: false,
    }

    // Initialize vendor_statuses and vendor_last_sender objects if not present using deep copies
    metadataUpdate.vendor_statuses = {
      ...((order.metadata?.vendor_statuses as any) || {}),
    }
    metadataUpdate.vendor_last_sender = {
      ...((order.metadata?.vendor_last_sender as any) || {}),
    }

    // Get all vendors currently in the quote
    const quoteVendors = new Set<string>()
    for (const item of order.items || []) {
      const vId = getVendorId(item.product_id)
      if (vId) quoteVendors.add(vId)
    }

    // For any vendor that had items added/removed/updated in this request, reset them to NEGOTIATING and update sender
    for (const vId of vendorScopes.keys()) {
      if (vId) {
        metadataUpdate.vendor_statuses[vId] = "NEGOTIATING"
        metadataUpdate.vendor_last_sender[vId] = senderType
      }
    }

    // Ensure all vendors in the quote have an initialized status and sender
    for (const vId of quoteVendors) {
      if (!metadataUpdate.vendor_statuses[vId]) {
        metadataUpdate.vendor_statuses[vId] = "NEGOTIATING"
      }
      if (!metadataUpdate.vendor_last_sender[vId]) {
        // Fallback: If no sender is set, assume the customer originated the quote request
        metadataUpdate.vendor_last_sender[vId] = "customer"
      }
    }

    let hasNoteChange = false
    if (changes.note !== undefined) {
      metadataUpdate.proposal_note = changes.note
      hasNoteChange = true
    }
    if (changes.discount_percentage !== undefined) {
      metadataUpdate.b2b_discount_percentage = changes.discount_percentage
    }
    if (changes.fixed_discount !== undefined) {
      metadataUpdate.b2b_fixed_discount = changes.fixed_discount
    }

    await updateDraftOrderWorkflow(scope).run({
      input: {
        id: orderId,
        user_id: actorId,
        metadata: metadataUpdate,
      },
    })

    if (hasNoteChange) {
      globalScope.diffEntries.push(`• Note Updated`)
      globalScope.structuredDiff.note_changed = { old_note: oldNote, new_note: changes.note }
    }
    if (changes.discount_percentage !== undefined) {
      globalScope.diffEntries.push(`• Discount Percentage: ${changes.discount_percentage}%`)
      globalScope.structuredDiff.discount_percentage = changes.discount_percentage
    }
    if (changes.fixed_discount !== undefined) {
      globalScope.diffEntries.push(`• Fixed Discount: ${this.formatMoney(changes.fixed_discount, order.currency_code)}`)
      globalScope.structuredDiff.fixed_discount = changes.fixed_discount
    }

    // 6. Confirm the batch edit session
    await confirmDraftOrderEditWorkflow(scope).run({
      input: {
        order_id: orderId,
        confirmed_by: actorId,
      },
    })

    // 7. Retrieve After State & calculate Diff Summary
    const { data: updatedOrders } = await query.graph({
      entity: "order",
      fields: [
        "id",
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
      filters: { id: orderId },
    })
    const updatedOrder = updatedOrders?.[0] || order
    const newTotal = this.parseNumber(updatedOrder.total)

    // Update globalScope totals with final calculated totals
    globalScope.structuredDiff.new_total = newTotal
    for (const scopeData of vendorScopes.values()) {
      scopeData.structuredDiff.new_total = newTotal
    }

    const senderLabel = senderType === "admin" ? "Admin" : "Customer"

    // 8. Generate Proposal Updated version history message in existing conversation
    const targetQuoteId = await resolveConversationId(orderId, query)
    let [conversation] = await companyService.listQuoteConversations(
      { quote_id: targetQuoteId },
      { relations: ["messages"] }
    )

    if (!conversation) {
      conversation = await companyService.createQuoteConversations({
        quote_id: targetQuoteId,
        company_id: order.metadata?.company_id || "default_company",
        customer_id: (order.customer_id as string) || actorId,
        status: "open",
      })
    }

    const messages: any[] = []

    for (const [vId, scopeData] of vendorScopes.entries()) {
      if (scopeData.diffEntries.length === 0 && vId !== null) continue
      if (scopeData.diffEntries.length === 0 && vId === null && vendorScopes.size > 1) continue

      let textSummary = `Proposal Updated\n${senderLabel} updated Proposal Agreement`
      if (scopeData.diffEntries.length > 0) textSummary += `\n` + scopeData.diffEntries.join("\n")
      if (vId === null) textSummary += `\nGrand Total: ${this.formatMoney(oldTotal, updatedOrder.currency_code)} → ${this.formatMoney(newTotal, updatedOrder.currency_code)}`

      const message = await companyService.createQuoteMessages({
        conversation_id: conversation.id,
        sender_type: senderType,
        sender_id: actorId,
        message_type: "proposal_update",
        text: textSummary,
        proposal_diff: scopeData.structuredDiff as Record<string, unknown>,
      })
      messages.push(message)
    }

    let fallbackMessage = messages[0]
    if (messages.length === 0) {
      fallbackMessage = await companyService.createQuoteMessages({
        conversation_id: conversation.id,
        sender_type: senderType,
        sender_id: actorId,
        message_type: "proposal_update",
        text: `Proposal Updated\n${senderLabel} updated Proposal Agreement`,
        proposal_diff: { vendor_id: null } as Record<string, unknown>,
      })
      messages.push(fallbackMessage)
    }

    return {
      order: updatedOrder,
      message: fallbackMessage,
      messages: messages,
      structured_diff: fallbackMessage.proposal_diff,
    }
  }

  static async approveProposalAgreement({
    orderId,
    actorId,
    scope,
  }: {
    orderId: string
    actorId: string
    scope: any
  }) {
    const query = scope.resolve("query")
    const companyService = scope.resolve(COMPANY_MODULE)
    const targetQuoteId = await resolveConversationId(orderId, query)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "metadata", "customer_id"],
      filters: { id: orderId },
    })

    const order = orders?.[0]
    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Draft Order not found")
    }

    const quoteStatus = order.metadata?.quote_status as string | undefined
    if (this.isQuoteLocked(quoteStatus)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Proposal Agreement is locked (${quoteStatus}) and cannot be approved.`
      )
    }

    // 1. Update order metadata
    const { result: updatedOrder } = await updateDraftOrderWorkflow(scope).run({
      input: {
        id: orderId,
        user_id: actorId,
        metadata: {
          ...(order.metadata || {}),
          admin_offer_approved: true,
        },
      },
    })

    // 2. Generate Conversation Message
    let [conversation] = await companyService.listQuoteConversations(
      { quote_id: targetQuoteId },
      { relations: ["messages"] }
    )

    if (!conversation) {
      conversation = await companyService.createQuoteConversations({
        quote_id: targetQuoteId,
        company_id: order.metadata?.company_id || "default_company",
        customer_id: (order.customer_id as string) || actorId,
        status: "open",
      })
    }

    const message = await companyService.createQuoteMessages({
      conversation_id: conversation.id,
      sender_type: "admin",
      sender_id: actorId,
      message_type: "proposal_update",
      text: "✅ Admin approved the latest proposal. The customer can now review and accept the offer.",
      proposal_diff: {},
    })

    return {
      order: updatedOrder,
      message,
    }
  }
}
