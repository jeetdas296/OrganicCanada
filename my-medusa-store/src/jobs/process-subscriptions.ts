import { MedusaContainer } from "@medusajs/framework/types"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"

export default async function processSubscriptions(container: MedusaContainer) {
  console.log("⏰ [CRON] Waking up to check for Subscription Renewals...")
  
  // 1. Grab the tools we need
  const query = container.resolve("query")
  const subscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE)

  // 2. Get the current date and time
  const today = new Date()

  try {
    // 3. Fetch ALL active subscriptions from our custom database
    const { data: subscriptions } = await query.graph({
      entity: "subscription",
      fields: ["id", "customer_id", "variant_id", "interval", "next_billing_date", "status"],
      filters: { status: "active" },
    })

    // Filter down to only the ones that are due today (or overdue)
    const dueSubscriptions = subscriptions.filter(
      (sub) => new Date(sub.next_billing_date) <= today
    )

    if (dueSubscriptions.length === 0) {
      console.log("✅ [CRON] No subscriptions due for renewal right now. Going back to sleep.")
      return
    }

    console.log(`🔄 [CRON] Found ${dueSubscriptions.length} subscriptions ready for renewal!`)

    // 4. Process the renewals!
    for (const sub of dueSubscriptions) {
      try {
        console.log(`💳 Charging Stripe for subscription ${sub.id}...`)
        // *Note: In full production, you trigger the Stripe API here using the saved payment method.*

        console.log(`📦 Generating fresh Medusa Order for customer ${sub.customer_id}...`)
        // *Note: In full production, you trigger a workflow here to create the physical order for the warehouse.*

        // 5. Calculate the next billing date so they don't get charged again tomorrow!
        const intervalDays = sub.interval === "monthly" ? 30 : 7 // Default 7 days for weekly
        const newBillingDate = new Date()
        newBillingDate.setDate(newBillingDate.getDate() + intervalDays)

        // 6. Update the database record
        // 🟢 THE FIX: Pass the ID inside the object!
        await subscriptionModuleService.updateSubscriptions({
          id: sub.id,
          next_billing_date: newBillingDate
        })

        console.log(`🎉 [CRON] SUCCESS: Subscription ${sub.id} renewed! Next bill date: ${newBillingDate.toLocaleDateString()}`)
      } catch (subError) {
        console.error(`❌ [CRON] Failed to renew subscription ${sub.id}:`, subError)
      }
    }
  } catch (error) {
    console.error("❌ [CRON] Critical failure fetching subscriptions:", error)
  }
}

// 🟢 THE SCHEDULE SETTINGS
export const config = {
  name: "process-subscriptions-job",
  // Standard CRON syntax. 
  // "0 0 * * *" means "Run at exactly 12:00 AM every night".
  // For testing right now, we will set it to "* * * * *" so it runs EVERY SINGLE MINUTE!
  schedule: "* * * * *", 
}