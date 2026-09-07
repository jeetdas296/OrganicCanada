import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { PalFulfillmentProviderService } from "../services/pal-fulfillment-provider"

// Wraps the PAL fulfillment provider service so it can be registered 
// within Medusa's @medusajs/fulfillment module
export default ModuleProvider(Modules.FULFILLMENT, {
  services: [PalFulfillmentProviderService],
})
