import { model } from "@medusajs/framework/utils"
import { PalProvider } from "./provider"

export const PalProviderService = model.define("pal_provider_service", {
  id: model.id().primaryKey(),
  provider: model.belongsTo(() => PalProvider),
  
  code: model.text(),
  name: model.text(),
  
  transport_mode: model.enum(["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]),
  
  domestic: model.boolean().default(false),
  cross_border: model.boolean().default(false),
  
  service_level: model.text().nullable(),
  
  enabled: model.boolean().default(true),
})