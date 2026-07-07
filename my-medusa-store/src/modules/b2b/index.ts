// src/modules/b2b/index.ts
import { Module } from "@medusajs/framework/utils"
import B2BModuleService from "./service"

export const B2B_MODULE = "b2bModuleService"

const B2BModule = Module(B2B_MODULE, {
  service: B2BModuleService,
})

export default B2BModule