// src/subscribers/b2b/quote-created.ts
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

export default async function b2bQuoteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ quote_id: string; customer_id: string }>) {
  // You can trigger notifications here
  // e.g., send email to admin, send confirmation to customer
  console.log(`[B2B] Quote created: ${data.quote_id} for customer: ${data.customer_id}`)
  
  // Add notification logic here when ready:
  // const notificationService = container.resolve("notificationModuleService")
  // await notificationService.createNotifications({ ... })
}

export const config: SubscriberConfig = {
  event: "b2b.quote.created",
}