import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { CustomsEngine } from "../../core"

export const customsCheckStepId = "customs-check-step"

export const customsCheckStep = createStep(
  customsCheckStepId,
  async (context: ShipmentContext, { container }) => {
    const engine = new CustomsEngine()
    const updatedContext = engine.generateComplianceDocuments(context)
    
    return new StepResponse(updatedContext)
  }
)
