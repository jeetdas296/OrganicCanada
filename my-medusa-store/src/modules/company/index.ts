import { Module } from "@medusajs/framework/utils"
import CompanyService from "./service"

export const COMPANY_MODULE = "company"

export default Module(COMPANY_MODULE, {
  service: CompanyService,
})
