import { MedusaService } from "@medusajs/framework/utils"
import { Vendor } from "./models/vendor"

// Medusa automatically generates standard database actions (create, update, delete, list)
class VendorService extends MedusaService({
  Vendor,
}) {}

export default VendorService