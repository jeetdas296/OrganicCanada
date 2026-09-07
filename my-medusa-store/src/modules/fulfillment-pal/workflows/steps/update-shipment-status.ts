import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { StatusEngine } from "../../core/status-engine"
import { FULFILLMENT_PAL_MODULE } from "../../index"

export const updateShipmentStatusStepId = "update-shipment-status-step"

export const updateShipmentStatusStep = createStep(
  updateShipmentStatusStepId,
  async (input: { shipmentId: string, providerId: string, trackingNumber: string, status: string }, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE) as any

    // 1. Retrieve current status from database
    const shipment = await palService.retrievePalShipment(input.shipmentId)
    const fromStatus = shipment.status

    // 2. Validate transition using StatusEngine (casting types dynamically)
    const engine = new StatusEngine()
    engine.validateTransition(fromStatus as any, input.status as any)

    // 3. Persist status and tracking reference to PalShipment record
    const updateData: any = {
      id: input.shipmentId,
      status: input.status
    }
    if (input.trackingNumber) {
      updateData.external_reference = input.trackingNumber
    }
    await palService.updatePalShipments(updateData)

    // 4. Record transition history in PalShipmentStatusHistory
    if (fromStatus !== input.status) {
      await palService.createPalShipmentStatusHistories({
        shipment_id: input.shipmentId,
        from_status: fromStatus,
        to_status: input.status,
        source: "SYSTEM",
        reason: `Shipment transitioned from ${fromStatus} to ${input.status}`
      })
    }

    return new StepResponse({
      success: true,
      status: input.status,
      trackingNumber: input.trackingNumber || null
    })
  }
)
