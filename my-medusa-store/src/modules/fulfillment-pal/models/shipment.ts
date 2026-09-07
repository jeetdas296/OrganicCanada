import { model } from "@medusajs/framework/utils"
import { PalPackage } from "./package"
import { PalShipmentStatusHistory } from "./shipment-status-history"
import { PalProviderBooking } from "./provider-booking"
import { PalShipmentTimeline } from "./shipment-timeline"

export const PalShipment = model.define("pal_shipment", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  vendor_id: model.text().nullable(),
  
  order_type: model.enum(["B2C", "B2B"]),
  trade_type: model.enum(["DOMESTIC", "CROSS_BORDER"]),
  trade_direction: model.enum(["DOMESTIC", "EXPORT", "IMPORT"]),
  
  origin_address_id: model.text(),
  destination_address_id: model.text(),
  
  transport_mode: model.enum(["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]).nullable(),
  status: model.text(),
  
  currency: model.text().nullable(),
  declared_value: model.bigNumber().nullable(),
  
  incoterm: model.text().nullable(),
  
  selected_provider_id: model.text().nullable(),
  selected_service_id: model.text().nullable(),
  
  external_reference: model.text().nullable(),
  
  packages: model.hasMany(() => PalPackage, { mappedBy: "shipment" }),
  status_history: model.hasMany(() => PalShipmentStatusHistory, { mappedBy: "shipment" }),
  bookings: model.hasMany(() => PalProviderBooking, { mappedBy: "shipment" }),
  timelines: model.hasMany(() => PalShipmentTimeline, { mappedBy: "shipment" }),
})