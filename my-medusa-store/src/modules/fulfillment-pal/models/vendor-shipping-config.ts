import { model } from "@medusajs/framework/utils"

export const PalVendorShippingConfig = model.define("pal_vendor_shipping_config", {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  
  enabled: model.boolean().default(true),
  
  default_incoterm: model.text().nullable(),
  
  allowed_modes: model.json().nullable(),
  preferred_providers: model.json().nullable(),
  pickup_settings: model.json().nullable(),
  
  international_enabled: model.boolean().default(false),
})