import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"
import { PalProvider } from "./provider"

export const PalTrackingEvent = model.define("pal_tracking_event", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  provider: model.belongsTo(() => PalProvider).nullable(),
  provider_event_id: model.text().nullable(),
  
  event_code: model.text().nullable(),
  normalized_status: model.text(),
  
  description: model.text().nullable(),
  
  location: model.text().nullable(),
  event_at: model.dateTime(),
  
  raw_payload: model.json().nullable(),
})