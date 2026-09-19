import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TrackingProcessor } from "../../../modules/fulfillment-pal/core/tracking-processor"
import { ShiprocketStatusMapper } from "../../../modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket/mapper"
import { FULFILLMENT_PAL_MODULE } from "../../../modules/fulfillment-pal/index"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // 1. Webhook Authentication
    const configuredSecret = process.env.SHIPROCKET_WEBHOOK_SECRET
    
    // According to Shiprocket docs, they typically send a custom header or token.
    // We will validate against 'x-api-token' or whatever is standard in Shiprocket UI.
    const incomingToken = req.headers["x-api-token"] || req.headers["x-api-key"] || req.headers["authorization"]

    if (!configuredSecret) {
      console.warn("[PAL][Webhook] Missing SHIPROCKET_WEBHOOK_SECRET env variable. Rejecting safely.")
      return res.status(401).json({ error: "Webhook not configured securely" })
    }

    if (incomingToken !== configuredSecret) {
      console.warn("[PAL][Webhook] Unauthorized Shiprocket webhook attempt.")
      return res.status(401).json({ error: "Unauthorized" })
    }

    // 2. Extract Event Payload
    // The payload usually contains 'awb', 'current_status', 'shipment_id'
    const payload = req.body as any
    const awbCode = payload.awb || payload.tracking_data?.track_url?.split("/").pop() || payload.awb_code
    
    if (!awbCode) {
      return res.status(400).json({ error: "Missing AWB in webhook payload" })
    }

    // 3. Resolve PAL Service
    const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)

    // 4. Deterministic Booking Lookup (carrier_id + awb)
    // We use the same structure Phase B uses for idempotency and lookup.
    // Note: listPalProviderBookings supports querying JSON fields if configured, 
    // but if not natively supported, we fetch bookings with that external_booking_id and verify carrier_id
    const bookings = await (palService as any).listPalProviderBookings({
      external_booking_id: awbCode
    })

    const targetBooking = bookings.find((b: any) => 
      b.response_payload?.metadata?.carrier_id === "shiprocket" && 
      String(b.response_payload?.metadata?.shiprocket_awb_code) === String(awbCode)
    )

    if (!targetBooking) {
      console.log(`[PAL][Webhook] No matching shiprocket booking found for AWB ${awbCode}. Acknowledging cleanly.`)
      // Acknowledge so Shiprocket doesn't retry endlessly for a shipment we don't own
      return res.status(200).json({ status: "ignored_unknown_booking" })
    }

    const shipmentId = targetBooking.shipment_id

    // 5. Normalize and Process
    // Map webhook payload directly to ProviderTrackingResult
    const trackingResult = ShiprocketStatusMapper.normalizeTrackingResponse(awbCode, payload)
    
    // Process idempotently through the common processor
    await TrackingProcessor.processTrackingResult(palService, shipmentId, trackingResult)

    return res.status(200).json({ status: "success" })

  } catch (error: any) {
    console.error("[PAL][Webhook] Error processing shiprocket webhook:", error)
    // Return 500 to allow Shiprocket to retry
    return res.status(500).json({ error: "Internal server error" })
  }
}
