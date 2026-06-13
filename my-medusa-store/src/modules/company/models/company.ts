// File: src/modules/company/models/company.ts
import { model } from "@medusajs/framework/utils"

export const Company = model.define("company", {
  id: model.id({ prefix: "comp" }).primaryKey(),
  name: model.text(),
  tax_id: model.text().nullable(),
  corporate_email: model.text().unique(),
  is_approved: model.boolean().default(false), // Super Admin must approve the business
})