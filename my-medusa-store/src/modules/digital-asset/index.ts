import { Module } from "@medusajs/framework/utils"
import DigitalAssetModuleService from "./service"

export const DIGITAL_ASSET_MODULE = "digitalAssetModuleService"

export default Module(DIGITAL_ASSET_MODULE, {
  service: DigitalAssetModuleService,
})