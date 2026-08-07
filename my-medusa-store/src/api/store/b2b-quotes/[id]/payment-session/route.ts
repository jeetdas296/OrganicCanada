// src/api/store/b2b-quotes/[id]/payment-session/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOrUpdateOrderPaymentCollectionWorkflow, createPaymentSessionsWorkflow } from "@medusajs/core-flows"
import { COMPANY_MODULE } from "../../../../../modules/company"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id

  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")
  const companyService = req.scope.resolve(COMPANY_MODULE)

  try {
    // 1. Fetch Draft Order and check ownership / company access
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "metadata",
        "status",
        "total",
        "currency_code",
        "region_id",
      ],
      filters: { id },
    })

    const draftOrder = orders?.[0]
    if (!draftOrder || draftOrder.metadata?.is_b2b_quote !== true) {
      return res.status(404).json({ message: "B2B Quote not found" })
    }

    if (!draftOrder.customer_id) {
      return res.status(403).json({ message: "Forbidden" })
    }

    const isAllowed = await companyService.isCustomerInSameCompany(
      callerId,
      draftOrder.customer_id as string,
      query
    )

    if (!isAllowed) {
      return res.status(403).json({ message: "Forbidden" })
    }

    // 2. Check that status is ready_for_payment, payment_pending, or approved
    const currentStatus = draftOrder.metadata?.quote_status
    if (
      currentStatus !== "ready_for_payment" &&
      currentStatus !== "payment_pending" &&
      currentStatus !== "approved"
    ) {
      return res.status(400).json({
        message: `Quote is not ready for payment. Current status: ${currentStatus}`,
      })
    }

    const orderTotal = Number(
      typeof draftOrder.total === "object" && draftOrder.total !== null
        ? (draftOrder.total as any).numeric ?? draftOrder.total
        : draftOrder.total || 0
    )

    // Verify minimum charge expected by Medusa and Stripe ($0.50 or equivalent)
    if (orderTotal < 0.50) {
      return res.status(400).json({
        message: `Order total (${orderTotal} ${draftOrder.currency_code}) is below Stripe minimum charge of 0.50`,
      })
    }

    // 3. Create or update Payment Collection for the Draft Order using standard Medusa order workflow
    await createOrUpdateOrderPaymentCollectionWorkflow(req.scope).run({
      input: {
        order_id: draftOrder.id,
        amount: orderTotal,
      },
    })

    const { data: orderPaymentCollections } = await query.graph({
      entity: "order_payment_collection",
      fields: ["payment_collection_id"],
      filters: { order_id: draftOrder.id },
    })

    const paymentCollectionId = orderPaymentCollections?.[0]?.payment_collection_id

    if (!paymentCollectionId) {
      return res.status(500).json({ message: "Failed to resolve payment collection for draft order" })
    }

    // 4. Query Payment Collection and its Payment Sessions
    const { data: paymentCollections } = await query.graph({
      entity: "payment_collection",
      fields: ["id", "amount", "payment_sessions.*"],
      filters: { id: paymentCollectionId },
    })

    const paymentCollection = paymentCollections?.[0]

    // 5. Inspect Region's configured Payment Providers identically to normal checkout (/store/payment-providers)
    const { data: regionPaymentProviders } = await query.graph({
      entity: "region_payment_provider",
      fields: ["payment_provider.*"],
      filters: { region_id: draftOrder.region_id as string },
    })

    const stripeProvider = regionPaymentProviders
      ?.map((rp: any) => rp.payment_provider)
      ?.find(
        (p: any) =>
          p?.is_enabled !== false &&
          (p?.id?.startsWith("pp_stripe_") ||
            p?.id?.startsWith("pp_medusa-") ||
            p?.id === "stripe")
      )

    if (!stripeProvider) {
      return res.status(400).json({
        message: `No Stripe payment provider configured for region ${draftOrder.region_id}`,
      })
    }

    const providerId = stripeProvider.id

    // Log investigation details before creating payment session
    console.log("=== B2B Payment Session Investigation Logs ===")
    console.log("draftOrder.total:", draftOrder.total)
    console.log("currency_code:", draftOrder.currency_code)
    console.log("Amount passed into createOrderPaymentCollectionWorkflow:", orderTotal)
    console.log("Amount passed into createPaymentSessionsWorkflow:", paymentCollection?.amount ?? orderTotal)
    console.log("Selected Stripe Provider ID from Region:", providerId)
    console.log("==============================================")

    let stripeSession = paymentCollection?.payment_sessions?.find(
      (s: any) => s.provider_id === providerId && s.status === "pending"
    )

    // 6. If no pending Stripe session exists, create one using configured Stripe provider
    if (!stripeSession) {
      await createPaymentSessionsWorkflow(req.scope).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: providerId,
        },
      })

      // Re-query to get updated session with client_secret
      const { data: updatedCollections } = await query.graph({
        entity: "payment_collection",
        fields: ["id", "amount", "payment_sessions.*"],
        filters: { id: paymentCollectionId },
      })
      stripeSession = updatedCollections?.[0]?.payment_sessions?.find(
        (s: any) => s.provider_id === providerId && s.status === "pending"
      )
    }

    return res.status(200).json({
      client_secret: stripeSession?.data?.client_secret || null,
      payment_collection_id: paymentCollectionId,
      amount: orderTotal,
      quote_status: currentStatus,
    })
  } catch (error: any) {
    console.error("Error creating B2B quote payment session:", error)
    return res.status(500).json({
      message: "Failed to create Stripe payment session for B2B quote",
      error: error.message,
    })
  }
}

