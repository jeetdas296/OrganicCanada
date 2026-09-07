import { Module } from "@medusajs/framework/utils"
import FulfillmentPalModuleService from "./service"

import { PalFulfillmentProviderService } from "./services/pal-fulfillment-provider"

export const FULFILLMENT_PAL_MODULE = "fulfillmentPal"

export default Module(FULFILLMENT_PAL_MODULE, {
  service: FulfillmentPalModuleService,
})
