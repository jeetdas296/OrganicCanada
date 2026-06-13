import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendDigitalAssetsWorkflow } from "../workflows/send-digital-assets"

// This function fires automatically when an order is placed
export default async function digitalDeliverySubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`🔍 [EVENT] Order ${data.id} placed! Checking for Digital Assets...`)
  
  // Trigger our new workflow
  await sendDigitalAssetsWorkflow(container).run({
    input: data.id,
  })
}

// Tell Medusa exactly which event to listen to
export const config: SubscriberConfig = {
  event: "order.placed",
}