
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function orderFulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("OMS: Fulfillment created for order: " + data.id)

  try {
    const query = container.resolve("query")
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "sales_channel_id"],
      filters: { id: data.id },
    })
    const order = orders[0]
    if (!order) return

    // TODO: Notify your 3rd-party fulfillment provider here
    console.log("OMS: Order " + order.id + " has " + order.items?.length + " item(s)")
  } catch (err: any) {
    console.error("[OMS] fulfillment_created error:", err.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
