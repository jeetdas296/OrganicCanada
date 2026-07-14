import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // --- AUTH CHECK ---
    const callerId = (req as any).auth_context?.actor_id
    if (!callerId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const customerId = req.query.customer_id as string
    
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" })
    }

    // --- IDOR CHECK: Verify the caller owns this customer_id ---
    if (callerId !== customerId) {
      return res.status(403).json({ error: "Forbidden" })
    }

    const subscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
    const query = req.scope.resolve("query")
    
    // 1. Fetch clean subscriptions from your custom module (No complex joins)
    const rawSubscriptions = await subscriptionModuleService.listSubscriptions({
      customer_id: customerId,
    })

    if (!rawSubscriptions || rawSubscriptions.length === 0) {
      return res.status(200).json({ subscriptions: [] })
    }

    // 2. Collect all the unique variant IDs from those subscriptions
    const variantIds = rawSubscriptions.map((s: any) => s.variant_id).filter(Boolean)

    // 3. Query Medusa's native catalog engine to get those variants and product titles
    let productMap: Record<string, string> = {}
    if (variantIds.length > 0) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "product.title"],
        filters: { id: variantIds },
      })

      // Map variant_id -> Product Title for lightning-fast lookups
      variants.forEach((v: any) => {
        if (v.product?.title) {
          productMap[v.id] = v.product.title
        }
      })
    }

    // 4. Combine the custom data and catalog data smoothly
    const hydratedSubscriptions = rawSubscriptions.map((sub: any) => ({
      ...sub,
      variant: {
        product: {
          title: productMap[sub.variant_id] || "Weekly Farm Veggie Box" // Smart fallback
        }
      }
    }))

    return res.status(200).json({ subscriptions: hydratedSubscriptions })

  } catch (error: any) {
    console.error("❌ Backend subscription endpoint crashed:", error)
    return res.status(500).json({ error: "Failed to fetch subscriptions" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // --- AUTH CHECK ---
    const callerId = (req as any).auth_context?.actor_id
    if (!callerId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { subscription_id } = req.body as { subscription_id: string }

    if (!subscription_id) {
      return res.status(400).json({ error: "Subscription ID is required" })
    }

    const subscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)

    // --- IDOR CHECK: Verify the caller owns this subscription ---
    const subs = await subscriptionModuleService.listSubscriptions({ id: subscription_id })
    if (!subs || subs.length === 0 || subs[0].customer_id !== callerId) {
      return res.status(403).json({ error: "Forbidden" })
    }

    // 2. Update the status column to 'canceled' in Postgres
    const updatedSubscription = await subscriptionModuleService.updateSubscriptions({
      id: subscription_id,
      status: "canceled",
    })

    return res.status(200).json({ 
      success: true, 
      message: "Subscription canceled successfully", 
      subscription: updatedSubscription 
    })

  } catch (error: any) {
    console.error("❌ Backend cancellation failure:", error)
    return res.status(500).json({ error: "Failed to cancel subscription" })
  }
}