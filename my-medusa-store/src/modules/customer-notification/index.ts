import CustomerNotificationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const CUSTOMER_NOTIFICATION_MODULE = "customerNotificationModuleService"

export default Module(CUSTOMER_NOTIFICATION_MODULE, {
  service: CustomerNotificationModuleService,
})
