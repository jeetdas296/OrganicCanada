import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`🔍 New order detected! Checking order: ${data.id} for subscriptions...`)

  // 1. Grab the tools we need
  const query = container.resolve("query")
  const subscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE)

  // 2. Fetch the order details, including the items and product metadata
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "customer_id",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
    ],
    filters: { id: data.id },
  })

  if (!order) {
    console.log("No items found in this order.")
    return
  }

  // 3. Loop through the cart items to see if they bought a subscription
  for (const item of order.items) {
      if (!item) continue; // 🟢 FIX 1: Tell TS to skip null items

      const productMetadata = item.variant?.product?.metadata || {}
      
      if (productMetadata.is_subscription === "true") {
        console.log(`📦 Subscription Item Found: ${item.title}`)
        
        // Create the subscription in the DB
        await subscriptionModuleService.createSubscriptions({
          customer_id: order.customer_id,
          original_order_id: order.id,
          variant_id: item.variant_id,
          stripe_payment_method_id: "pm_mock_123", 
          interval: productMetadata.subscription_interval || "weekly",
          next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
          status: "active"
        } as any) // 🟢 FIX 2: Add 'as any' here to bypass strict DML type checking
        
        console.log(`🎉 SUCCESS: Subscription saved to database for customer ${order.customer_id}!`)
      }
    }
}

// This tells Medusa to run this script ONLY when an order is officially placed
export const config: SubscriberConfig = {
  event: "order.placed",
}