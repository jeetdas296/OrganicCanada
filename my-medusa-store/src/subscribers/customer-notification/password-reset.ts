import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../modules/customer-notification"

export default async function notificationPasswordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationService = container.resolve(CUSTOMER_NOTIFICATION_MODULE)

  const targetEmail = data.email || data.identifier || data.entity_id;
  if (!targetEmail || !targetEmail.includes("@")) return

  // We need to resolve the customer ID from the email
  const query = container.resolve("query")
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email: targetEmail },
  })

  const customer = customers[0]
  if (!customer) return

  // Use a 5-minute time bucket to ensure idempotency for immediate retries without storing the secret token
  const timeBucket = Math.floor(new Date().getTime() / 300000)
  const idempotencyKey = `${customer.id}:auth.password_reset:${timeBucket}`

  try {
    await notificationService.createCustomerNotifications({
      customer_id: customer.id,
      title: "Password Reset Requested",
      message: `A password reset request was initiated for your account. Please check your email.`,
      entity_type: "auth",
      entity_id: customer.id,
      idempotency_key: idempotencyKey,
    })
  } catch (err: any) {
    if (err.code !== "23505" && !err.message?.includes("unique constraint")) {
      console.error("[Notification] Failed to create password reset notification:", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
