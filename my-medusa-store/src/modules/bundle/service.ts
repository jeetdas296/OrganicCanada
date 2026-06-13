import { MedusaService } from "@medusajs/framework/utils"
import { Bundle } from "./models/bundle"
import { BundleItem } from "./models/bundle"

// MedusaService auto-generates all CRUD methods for Bundle and BundleItem
class BundleModuleService extends MedusaService({
  Bundle,
  BundleItem,
}) {}

export default BundleModuleService
