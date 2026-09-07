import { model } from "@medusajs/framework/utils"

export const PalCountryRule = model.define("pal_country_rule", {
  id: model.id().primaryKey(),
  
  origin_country: model.text().nullable(),
  destination_country: model.text().nullable(),
  
  trade_type: model.enum(["DOMESTIC", "CROSS_BORDER"]).nullable(),
  transport_mode: model.enum(["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]).nullable(),
  
  rule_type: model.text(),
  rule_data: model.json().nullable(),
  
  enabled: model.boolean().default(true),
})