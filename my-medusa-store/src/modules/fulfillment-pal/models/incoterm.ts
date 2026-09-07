import { model } from "@medusajs/framework/utils"

export const PalIncoterm = model.define("pal_incoterm", {
  id: model.id().primaryKey(),
  code: model.text(),
  name: model.text(),
  description: model.text().nullable(),
  enabled: model.boolean().default(true),
})