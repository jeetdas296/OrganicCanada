import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("OMS: Payment captured: " + data.id)
  // TODO: Sync with accounting / ERP system here
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}