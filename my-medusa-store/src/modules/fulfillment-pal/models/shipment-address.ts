import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalShipmentAddress = model.define("pal_shipment_address", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  type: model.enum(["FROM", "TO", "BILLING"]),
  
  company: model.text().nullable(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  
  address_1: model.text(),
  address_2: model.text().nullable(),
  city: model.text(),
  province: model.text().nullable(),
  postal_code: model.text(),
  country_code: model.text(),
  
  phone: model.text().nullable(),
  email: model.text().nullable(),
  
  tax_id: model.text().nullable(),
  business_number: model.text().nullable(),
})