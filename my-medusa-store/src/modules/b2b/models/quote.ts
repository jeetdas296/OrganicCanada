import { model } from "@medusajs/framework/utils"

export const Quote = model.define("quote", {
  id: model.id().primaryKey(),

  cart_id: model.text().nullable(),
  order_id: model.text().nullable(),

  // Keep it nullable if you use it
  draft_order_id: model.text().nullable(),

  company_id: model.text().nullable(),
  customer_id: model.text().nullable(),

  status: model
    .enum([
      "pending_approval",
      "approved",
      "rejected",
      "converted",
      "canceled",
    ])
    .default("pending_approval"),

  payment_term: model.text().nullable(),

  total: model.bigNumber().nullable(),
  currency_code: model.text().nullable(),

  metadata: model.json().nullable(),
  expires_at: model.dateTime().nullable(),
})