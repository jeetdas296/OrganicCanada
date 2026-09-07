import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalTransport = model.define("pal_transport", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  mode: model.enum(["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]),
  service_level: model.text().nullable(),
  carrier_service: model.text().nullable(),
  
  estimated_transit_days: model.number().nullable(),
  
  estimated_cost: model.bigNumber().nullable(),
  actual_cost: model.bigNumber().nullable(),
  currency: model.text().nullable(),
})