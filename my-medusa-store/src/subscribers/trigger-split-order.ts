import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { splitOrderWorkflow } from "../workflows/split-order" // Point this to your orchestrator file

export default async function splitOrderTrigger({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`⚡ [EVENT] Order ${data.id} placed! Firing Split Order Workflow...`)

  // Execute your brilliant split order engine!
  await splitOrderWorkflow(container).run({
    input: { orderId: data.id }
  })
}

// This listens for standard B2C checkouts AND your new B2B quote approvals!
export const config: SubscriberConfig = {
  event: "order.placed",
}