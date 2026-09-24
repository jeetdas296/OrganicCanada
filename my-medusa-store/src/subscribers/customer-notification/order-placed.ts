import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../modules/customer-notification"

export default async function notificationOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const notificationService = container.resolve(CUSTOMER_NOTIFICATION_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "currency_code", "total"],
    filters: { id: data.id },
  })

  const order = orders[0]
  if (!order || !order.customer_id) return

  const totalAmount = order.total ? (Number(order.total) / 100).toFixed(2) : "0.00"
  const currency = order.currency_code ? order.currency_code.toUpperCase() : ""

  const idempotencyKey = `${order.customer_id}:order.placed:${order.id}`

  try {
    await notificationService.createCustomerNotifications({
      customer_id: order.customer_id,
      title: "Order Confirmed",
      message: `Your order #${order.id.slice(-6).toUpperCase()} has been confirmed! Total: $${totalAmount} ${currency}.`,
      entity_type: "order",
      entity_id: order.id,
      idempotency_key: idempotencyKey,
    })
  } catch (err: any) {
    if (err.code !== "23505" && !err.message?.includes("unique constraint")) {
      console.error("[Notification] Failed to create order placed notification:", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
