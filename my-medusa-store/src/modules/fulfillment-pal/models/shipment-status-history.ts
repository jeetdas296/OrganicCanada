import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalShipmentStatusHistory = model.define("pal_shipment_status_history", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  from_status: model.text().nullable(),
  to_status: model.text(),
  
  source: model.text().nullable(),
  reason: model.text().nullable(),
  metadata: model.json().nullable(),
})