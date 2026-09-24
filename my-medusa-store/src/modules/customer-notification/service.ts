import { MedusaService } from "@medusajs/framework/utils"
import { CustomerNotification } from "./models/customer-notification"

class CustomerNotificationModuleService extends MedusaService({
  CustomerNotification,
}) {
}

export default CustomerNotificationModuleService
