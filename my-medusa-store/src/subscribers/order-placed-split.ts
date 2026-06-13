import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { splitOrderWorkflow } from "../workflows/split-order"

// 🟢 THE LISTENER: Waits for a successful checkout and triggers the workflow
export default async function orderPlacedSplitHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`\n🔔 Split-Engine detected new order: ${data.id}`)

  // Execute the workflow we just built
  await splitOrderWorkflow(container).run({
    input: {
      orderId: data.id,
    },
  })
}

// Subscribe to the core Medusa order placed event
export const config: SubscriberConfig = {
  event: "order.placed",
}