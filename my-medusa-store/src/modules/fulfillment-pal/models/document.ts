import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalDocument = model.define("pal_document", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  type: model.text(),
  status: model.text(),
  
  file_id: model.text().nullable(),
  file_url: model.text().nullable(),
  file_name: model.text().nullable(),
  mime_type: model.text().nullable(),
  file_size: model.number().nullable(),
  
  timeline_step_id: model.text().nullable(),
  
  document_number: model.text().nullable(),
  generated_by: model.text().nullable(),
  uploaded_by: model.text().nullable(),
  uploaded_at: model.dateTime().nullable(),
  
  version: model.number().default(1),
})