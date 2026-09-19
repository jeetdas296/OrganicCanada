import { ProviderTrackingResult } from "../providers/provider-interface"
import { StatusEngine, ShipmentStatus } from "./status-engine"
import crypto from "crypto"

export class TrackingProcessor {
  /**
   * Processes a normalized tracking result, ensuring idempotency and orderly state transitions.
   */
  public static async processTrackingResult(
    palService: any,
    shipmentId: string,
    result: ProviderTrackingResult
  ): Promise<void> {
    const engine = new StatusEngine()
    
    // Retrieve existing shipment to determine current state
    const shipment = await palService.retrievePalShipment(shipmentId)
    const currentStatus = shipment.status as ShipmentStatus

    let targetStatus = currentStatus
    let statusChanged = false

    // Process each event chronologically (they should be sorted by mapper)
    for (const event of result.events) {
      // 1. Generate idempotent hash for this specific provider event
      const rawString = `${result.provider}:${result.trackingNumber}:${event.status}:${event.occurredAt.getTime()}:${event.description || ""}`
      const eventHash = crypto.createHash("sha256").update(rawString).digest("hex")

      // 2. Check if this exact event is already recorded
      const existingEvents = await palService.listPalTrackingEvents({
        provider_event_id: eventHash
      })

      if (existingEvents.length > 0) {
        // Event already processed, skip
        continue
      }

      // 3. Record the new event
      try {
        await palService.createPalTrackingEvents({
          shipment_id: shipmentId,
          provider_event_id: eventHash,
          event_code: event.status,
          normalized_status: event.status,
          description: event.description,
          location: event.location,
          event_at: event.occurredAt,
          raw_payload: result.raw
        })
      } catch (err: any) {
        // Detect database unique constraint violation (code 23505 in postgres, or message contents)
        if (err.code === '23505' || err.message?.toLowerCase().includes('unique constraint')) {
          console.log(`[PAL][TrackingProcessor] Database prevented concurrent duplicate event insertion for hash ${eventHash}. Skipping safely.`)
          continue
        }
        throw err
      }

      // 4. Validate transition using StatusEngine
      try {
        // If StatusEngine successfully validates, it means it's a forward chronological transition
        if (targetStatus !== event.status) {
          engine.validateTransition(targetStatus, event.status as ShipmentStatus)
          targetStatus = event.status as ShipmentStatus
          statusChanged = true
        }
      } catch (err: any) {
        // Validation failed (e.g., trying to move from DELIVERED back to IN_TRANSIT)
        // We log it and DO NOT update the targetStatus, but the TrackingEvent is already saved safely.
        console.warn(`[PAL][TrackingProcessor] Skipping invalid status transition: ${targetStatus} -> ${event.status}. Reason: ${err.message}`)
      }
    }

    // 5. If a valid transition occurred, update shipment and history
    if (statusChanged && targetStatus !== currentStatus) {
      // Update shipment record
      const updateData: any = {
        id: shipmentId,
        status: targetStatus
      }
      if (result.trackingNumber) {
        updateData.external_reference = result.trackingNumber
      }
      await palService.updatePalShipments(updateData)

      // Record transition in the canonical StatusHistory
      await palService.createPalShipmentStatusHistories({
        shipment_id: shipmentId,
        from_status: currentStatus,
        to_status: targetStatus,
        source: "PROVIDER_WEBHOOK_OR_POLL",
        reason: `Shipment transitioned from ${currentStatus} to ${targetStatus} via ${result.provider}`
      })
      
      console.log(`[PAL][TrackingProcessor] Shipment ${shipmentId} updated to ${targetStatus}`)
    }
  }
}
