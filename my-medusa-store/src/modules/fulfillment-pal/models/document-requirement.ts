import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalDocumentRequirement = model.define("pal_document_requirement", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  document_type: model.text(),
  
  required: model.boolean().default(true),
  reason: model.text().nullable(),
  
  rule_id: model.text().nullable(),
  
  status: model.text(),
})