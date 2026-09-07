import { model } from "@medusajs/framework/utils"

export const PalVendorLocation = model.define("pal_vendor_location", {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  
  name: model.text(),
  address: model.json().nullable(), // simplified for storing location structure
  contact: model.json().nullable(),
  
  operational_hours: model.json().nullable(),
  
  enabled: model.boolean().default(true),
})