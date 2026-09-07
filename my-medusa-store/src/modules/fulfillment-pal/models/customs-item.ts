import { model } from "@medusajs/framework/utils"
import { PalCustomsDeclaration } from "./customs-declaration"
import { PalShipmentItem } from "./shipment-item"

export const PalCustomsItem = model.define("pal_customs_item", {
  id: model.id().primaryKey(),
  customs_declaration: model.belongsTo(() => PalCustomsDeclaration),
  
  shipment_item: model.belongsTo(() => PalShipmentItem).nullable(),
  
  hs_code: model.text().nullable(),
  description: model.text(),
  
  quantity: model.number(),
  unit_value: model.bigNumber(),
  total_value: model.bigNumber(),
  
  country_of_origin: model.text().nullable(),
  
  weight: model.number().nullable(),
})