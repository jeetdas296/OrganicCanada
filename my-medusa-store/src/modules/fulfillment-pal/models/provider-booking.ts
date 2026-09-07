import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"
import { PalProvider } from "./provider"
import { PalProviderService } from "./provider-service"

export const PalProviderBooking = model.define("pal_provider_booking", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  provider: model.belongsTo(() => PalProvider),
  provider_service: model.belongsTo(() => PalProviderService).nullable(),
  
  external_booking_id: model.text().nullable(),
  external_shipment_id: model.text().nullable(),
  
  status: model.text(),
  
  request_payload: model.json().nullable(),
  response_payload: model.json().nullable(),
  
  booked_at: model.dateTime().nullable(),
})