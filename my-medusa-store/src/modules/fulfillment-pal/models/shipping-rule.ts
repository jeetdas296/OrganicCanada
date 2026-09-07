import { model } from "@medusajs/framework/utils"

export const PalShippingRule = model.define("pal_shipping_rule", {
  id: model.id().primaryKey(),
  
  name: model.text(),
  priority: model.number().default(0),
  enabled: model.boolean().default(true),
  
  conditions: model.json(),
  actions: model.json(),
  
  created_by: model.text().nullable(),
})