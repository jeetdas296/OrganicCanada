import { model } from "@medusajs/framework/utils"

export const PosUser = model.define("pos_user", {
  id: model.id({ prefix: "posu" }).primaryKey(),
  email: model.text().unique(),
  password_hash: model.text(),
  full_name: model.text(),
  role: model.enum(["cashier"]).default("cashier"),
  active: model.boolean().default(true),
  store_location_id: model.text().nullable(),
  sales_channel_id: model.text().nullable(),
})
