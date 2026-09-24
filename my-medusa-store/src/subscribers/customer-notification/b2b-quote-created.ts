import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../modules/customer-notification"

export default async function notificationB2bQuoteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ quote_id: string; customer_id: string }>) {
  const notificationService = container.resolve(CUSTOMER_NOTIFICATION_MODULE)

  if (!data.customer_id) return

  const idempotencyKey = `${data.customer_id}:b2b.quote.created:${data.quote_id}`

  try {
    await notificationService.createCustomerNotifications({
      customer_id: data.customer_id,
      title: "B2B Quote Generated",
      message: `A new B2B quote has been generated for your review.`,
      entity_type: "quote",
      entity_id: data.quote_id,
      idempotency_key: idempotencyKey,
    })
  } catch (err: any) {
    if (err.code !== "23505" && !err.message?.includes("unique constraint")) {
      console.error("[Notification] Failed to create B2B quote notification:", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "b2b.quote.created",
}
