import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { TradeClassifier } from "../../core/trade-classifier"
import { FULFILLMENT_PAL_MODULE } from "../../index"

export const classifyTradeStepId = "classify-trade-step"

export const classifyTradeStep = createStep(
  classifyTradeStepId,
  async (context: ShipmentContext, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)
    
    const classifier = new TradeClassifier("CA")
    const updatedContext = classifier.classify(context)

    console.log("[PAL_VERIFY_CLASSIFICATION]", {
      originCountry: updatedContext.origin?.countryCode || null,
      destinationCountry: updatedContext.destination?.countryCode || null,
      orderType: updatedContext.orderType || null,
      tradeType: updatedContext.tradeType || null,
    })
    
    // Persist classified trade classification to database
    await palService.updatePalShipments({
      id: context.shipmentId,
      trade_type: updatedContext.tradeType,
      trade_direction: updatedContext.tradeDirection
    })

    return new StepResponse(updatedContext)
  }
)
