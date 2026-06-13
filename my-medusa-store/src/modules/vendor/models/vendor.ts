import { model } from "@medusajs/framework/utils"

export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  user_id: model.text().nullable(), // 🟢 THE SHORTCUT: Store the Medusa User ID right here
  name: model.text(),             
  email: model.text().unique(),   
  handle: model.text().unique(), 
  commission_rate: model.number().default(15), 
  is_active: model.boolean().default(false),
})