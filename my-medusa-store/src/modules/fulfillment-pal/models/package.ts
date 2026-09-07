import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalPackage = model.define("pal_package", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  package_type: model.text(),
  
  length: model.number().nullable(),
  width: model.number().nullable(),
  height: model.number().nullable(),
  dimension_unit: model.text().nullable(),
  
  weight: model.number().nullable(),
  weight_unit: model.text().nullable(),
  
  quantity: model.number(),
  
  label_id: model.text().nullable(),
})