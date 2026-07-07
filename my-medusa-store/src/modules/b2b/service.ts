// src/modules/b2b/service.ts
import { MedusaService } from "@medusajs/framework/utils"
import { Quote } from "./models/quote"

class B2BModuleService extends MedusaService({
  Quote,
}) {}

export default B2BModuleService