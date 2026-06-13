import { Module } from "@medusajs/framework/utils"
import VendorService from "./service"

export const VENDOR_MODULE = "vendor"

export default Module(VENDOR_MODULE, {
  service: VendorService,
})