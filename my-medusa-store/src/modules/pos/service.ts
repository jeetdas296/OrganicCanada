import { MedusaService } from "@medusajs/framework/utils"
import { PosUser } from "./models/pos-user"

class PosModuleService extends MedusaService({
  PosUser,
}) {}

export default PosModuleService
