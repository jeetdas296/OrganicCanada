import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../modules/customer-notification"

export default async function notificationOrderReturnRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const notificationService = container.resolve(CUSTOMER_NOTIFICATION_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: data.id },
  })

  const order = orders[0]
  if (!order || !order.customer_id) return

  const idempotencyKey = `${order.customer_id}:order.return_requested:${order.id}`

  try {
    await notificationService.createCustomerNotifications({
      customer_id: order.customer_id,
      title: "Return Requested",
      message: `Your return request for order #${order.id.slice(-6).toUpperCase()} has been received and is pending vendor review.`,
      entity_type: "order",
      entity_id: order.id,
      idempotency_key: idempotencyKey,
    })
  } catch (err: any) {
    if (err.code !== "23505" && !err.message?.includes("unique constraint")) {
      console.error("[Notification] Failed to create order return notification:", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.return_requested",
}
