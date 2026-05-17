import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IPromotionModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const promotionModuleService: IPromotionModuleService = req.scope.resolve(Modules.PROMOTION)
    
    const promotions = await promotionModuleService.listPromotions(
      { status: ["active"] }, 
      { relations: ["application_method", "campaign"] }
    )
    
    res.json({ coupons: promotions })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}