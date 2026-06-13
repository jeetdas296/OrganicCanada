import { model } from "@medusajs/framework/utils"

export const Subscription = model.define("subscription", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  original_order_id: model.text(), // To track the very first order
  variant_id: model.text(),        // What specific item they subscribed to
  stripe_payment_method_id: model.text(), // The secure token to charge them later
  interval: model.text(),          // e.g., "weekly" or "monthly"
  next_billing_date: model.dateTime(),
  status: model.enum(["active", "paused", "canceled"]).default("active"),
})