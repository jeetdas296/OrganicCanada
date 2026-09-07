import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalShipmentEvent = model.define("pal_shipment_event", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  event_type: model.text(),
  source: model.text().nullable(),
  payload: model.json().nullable(),
})