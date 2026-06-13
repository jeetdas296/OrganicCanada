import { MedusaService } from "@medusajs/framework/utils"
import { Subscription } from "./models/subscription"

// Medusa automatically generates all the database methods (create, update, delete) for us!
class SubscriptionService extends MedusaService({
  Subscription,
}) {}

export default SubscriptionService