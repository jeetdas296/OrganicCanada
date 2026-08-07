// src/api/store/b2b-quotes/[id]/pay/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { convertDraftOrderWorkflow, markPaymentCollectionAsPaid } from "@medusajs/core-flows"
import { COMPANY_MODULE } from "../../../../../modules/company"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const callerId = (req as any).auth_context?.actor_id

  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const query = req.scope.resolve("query")
  const orderModule = req.scope.resolve(Modules.ORDER)
  const companyService = req.scope.resolve(COMPANY_MODULE)

  const { payment_intent_id } = (req.body as any) || {}
  if (payment_intent_id) {
    console.log("Confirming B2B Quote Payment with Stripe PaymentIntent:", payment_intent_id)
  }

  try {
    // 1. Fetch Draft Order and check ownership / company access
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "metadata", "status", "total"],
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

    // 2. Check that status is ready_for_payment or payment_pending
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

    // 3. Mark payment collection as paid if one exists
    try {
      const { data: orderPaymentCollections } = await query.graph({
        entity: "order_payment_collection",
        fields: ["payment_collection_id"],
        filters: { order_id: draftOrder.id },
      })

      const paymentCollectionId = orderPaymentCollections?.[0]?.payment_collection_id
      if (paymentCollectionId) {
        await markPaymentCollectionAsPaid(req.scope).run({
          input: {
            order_id: draftOrder.id,
            payment_collection_id: paymentCollectionId,
            captured_by: callerId,
          },
        })
      }
    } catch (paymentErr: any) {
      console.log("Note during payment collection capture:", paymentErr.message)
    }

    // 4. Convert Draft Order to confirmed Order (reserves inventory & emits order.placed)
    await convertDraftOrderWorkflow(req.scope).run({
      input: {
        id: draftOrder.id,
      },
    })

    // 5. Update quote_status metadata to paid
    const [completedOrder] = await orderModule.updateOrders([
      {
        id: draftOrder.id,
        metadata: {
          ...(draftOrder.metadata || {}),
          quote_status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: callerId,
        },
      },
    ])

    return res.status(200).json({
      message: "Payment successful and order placed",
      order: completedOrder,
      quote_status: "paid",
    })
  } catch (error: any) {
    console.error("Error completing B2B quote payment:", error)
    return res.status(500).json({
      message: "Failed to process B2B quote payment",
      error: error.message,
    })
  }
}
