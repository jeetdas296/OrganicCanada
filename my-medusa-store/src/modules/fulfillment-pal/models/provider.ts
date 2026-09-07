import { model } from "@medusajs/framework/utils"

export const PalProvider = model.define("pal_provider", {
  id: model.id().primaryKey(),
  
  code: model.text(),
  name: model.text(),
  type: model.text(),
  
  enabled: model.boolean().default(true),
  priority: model.number().default(0),
  
  configuration: model.json().nullable(),
})