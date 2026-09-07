import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { FULFILLMENT_PAL_MODULE } from "../../index"
import { TimelineGenerator } from "../../core/timeline-generator"

export const generateTimelineStepId = "generate-timeline-step"

export const generateTimelineStep = createStep(
  generateTimelineStepId,
  async (context: ShipmentContext, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)

    // Check if timeline already exists for idempotency
    const existingTimelines = await (palService as any).listPalShipmentTimelines({
      shipment_id: context.shipmentId
    }, {
      relations: ["steps"]
    })

    if (existingTimelines && existingTimelines.length > 0) {
      return new StepResponse(context)
    }
    
    // Generate Timeline based on finalized Scenario (after trade classification and transport mode)
    const scenario = TimelineGenerator.determineScenario(context)
    const timelineSteps = TimelineGenerator.getStepsForScenario(scenario)
    
    const timeline = await (palService as any).createPalShipmentTimelines({
      shipment_id: context.shipmentId,
      scenario: scenario
    }) as any

    for (const stepDef of timelineSteps) {
      let stepStatus = "LOCKED"
      if (stepDef.order === 1) {
        stepStatus = "AVAILABLE"
      }

      await (palService as any).createPalShipmentTimelineSteps({
        timeline_id: timeline.id,
        step_code: stepDef.code,
        step_name: stepDef.name,
        step_order: stepDef.order,
        status: stepStatus,
        configuration: {},
        started_at: stepStatus === "AVAILABLE" ? new Date() : null,
        completed_at: null,
        completed_by: null
      })
    }

    return new StepResponse(context)
  },
  async (context, { container }) => {
    // Compensation function (could delete timeline, but not strictly necessary for robustness)
    if (!context?.shipmentId) return
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)
    try {
      // Fetch and delete timelines for this shipment
      const existingTimelines = await (palService as any).listPalShipmentTimelines({
        shipment_id: context.shipmentId
      })
      for (const t of existingTimelines) {
        await (palService as any).deletePalShipmentTimelines(t.id)
      }
    } catch (_) {}
  }
)
