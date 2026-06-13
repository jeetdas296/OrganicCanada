import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const customerId = req.query.customer_id as string
    
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" })
    }

    const subscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
    const query = req.scope.resolve("query")
    
    // 1. Fetch clean subscriptions from your custom module (No complex joins)
    const rawSubscriptions = await subscriptionModuleService.listSubscriptions({
      customer_id: customerId,
    })

    if (!rawSubscriptions || rawSubscriptions.length === 0) {
      res.setHeader("Access-Control-Allow-Origin", "*")
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

    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json({ subscriptions: hydratedSubscriptions })

  } catch (error: any) {
    console.error("❌ Backend subscription endpoint crashed:", error)
    return res.status(500).json({ error: error.message || "Failed to fetch subscriptions" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { subscription_id } = req.body as { subscription_id: string }

    if (!subscription_id) {
      return res.status(400).json({ error: "Subscription ID is required" })
    }

    // 1. Resolve our custom database module
    const subscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)

    // 2. 🟢 THE FIX: Update the status column to 'canceled' in Postgres
    const updatedSubscription = await subscriptionModuleService.updateSubscriptions({
      id: subscription_id,
      status: "canceled",
    })

    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json({ 
      success: true, 
      message: "Subscription canceled successfully", 
      subscription: updatedSubscription 
    })

  } catch (error: any) {
    console.error("❌ Backend cancellation failure:", error)
    return res.status(500).json({ error: error.message || "Failed to cancel subscription" })
  }
}