import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function orderReturnRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("OMS: Return requested for order: " + data.id)

  try {
    const query = container.resolve("query")
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "items.*"],
      filters: { id: data.id },
    })
    const order = orders[0]
    if (!order) return

    // TODO: Notify vendor about the return via email / webhook
    console.log("OMS: Return on order " + order.id + " — notifying vendor...")
  } catch (err: any) {
    console.error("[OMS] return_requested error:", err.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.return_requested",
}