import { MedusaService } from "@medusajs/framework/utils"
import { DigitalAsset } from "./models/digital-asset"

// MedusaService automatically generates all the CRUD methods for us!
class DigitalAssetModuleService extends MedusaService({
  DigitalAsset,
}) {}

export default DigitalAssetModuleService