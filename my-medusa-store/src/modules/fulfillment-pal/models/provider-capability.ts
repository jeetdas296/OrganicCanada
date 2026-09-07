import { model } from "@medusajs/framework/utils"
import { PalProvider } from "./provider"

export const PalProviderCapability = model.define("pal_provider_capability", {
  id: model.id().primaryKey(),
  provider: model.belongsTo(() => PalProvider),
  
  transport_mode: model.enum(["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]),
  
  domestic: model.boolean().default(false),
  cross_border: model.boolean().default(false),
  
  rating: model.boolean().default(false),
  booking: model.boolean().default(false),
  tracking: model.boolean().default(false),
  label: model.boolean().default(false),
  customs: model.boolean().default(false),
  
  enabled: model.boolean().default(true),
})