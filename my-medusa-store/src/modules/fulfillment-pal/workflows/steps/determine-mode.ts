import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { TransportModeEngine } from "../../core/transport-mode"
import { FULFILLMENT_PAL_MODULE } from "../../index"

export const determineModeStepId = "determine-mode-step"

export const determineModeStep = createStep(
  determineModeStepId,
  async (context: ShipmentContext, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)

    const engine = new TransportModeEngine()
    const updatedContext = engine.determineMode(context)
    
    // Persist determined transport mode to database
    await palService.updatePalShipments({
      id: context.shipmentId,
      transport_mode: updatedContext.transportMode
    })

    return new StepResponse(updatedContext)
  }
)
