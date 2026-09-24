import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../modules/customer-notification"

export default async function notificationPalTimelineStepHandler({
  event: { data },
  container,
}: SubscriberArgs<{ shipmentId: string; stepCode: string }>) {
  const query = container.resolve("query")
  const notificationService = container.resolve(CUSTOMER_NOTIFICATION_MODULE)

  const { data: shipments } = await query.graph({
    entity: "pal_shipment",
    fields: ["id", "order_id", "status"],
    filters: { id: data.shipmentId },
  })

  const shipment = shipments[0]
  if (!shipment || !shipment.order_id) return

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: shipment.order_id },
  })

  const order = orders[0]
  if (!order || !order.customer_id) return

  const idempotencyKey = `${order.customer_id}:pal.timeline_step.completed:${data.shipmentId}:${data.stepCode}`
  
  let title = "Shipment Updated"
  let message = `Your shipment timeline has advanced: ${data.stepCode.replace(/_/g, " ")}.`

  if (data.stepCode === "OUT_FOR_DELIVERY") {
    title = "Shipment Out for Delivery"
    message = `Great news! Your shipment is out for delivery today.`
  } else if (data.stepCode === "DELIVERED") {
    title = "Shipment Delivered"
    message = `Your shipment has been successfully delivered!`
  }

  try {
    await notificationService.createCustomerNotifications({
      customer_id: order.customer_id,
      title,
      message,
      entity_type: "shipment",
      entity_id: data.shipmentId,
      idempotency_key: idempotencyKey,
    })
  } catch (err: any) {
    if (err.code !== "23505" && !err.message?.includes("unique constraint")) {
      console.error("[Notification] Failed to create shipment step notification:", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "pal.timeline_step.completed",
}
