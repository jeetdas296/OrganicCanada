import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../../modules/fulfillment-pal"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)

  // --- 1. Authenticate ---
  const callerId = (req as any).auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    // --- 2. Verify Order Ownership ---
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "customer_id"],
      filters: { id: orderId }
    })

    const order = orders[0]
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.customer_id !== callerId) {
      return res.status(403).json({ message: "Forbidden: You don't have access to this order." })
    }

    // --- 3. Retrieve PAL Shipments ---
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: [
        "id",
        "status",
        "trade_type",
        "transport_mode",
        "selected_provider_id"
      ],
      filters: { order_id: orderId }
    })

    if (!shipments || shipments.length === 0) {
      return res.status(200).json({ 
        order: { displayId: order.display_id }, 
        shipments: [] 
      })
    }

    const validShipments = shipments.filter((s: any) => s.status !== "FAILED")

    if (validShipments.length === 0) {
      return res.status(200).json({ 
        order: { displayId: order.display_id }, 
        shipments: [] 
      })
    }

    // --- 4. Enhance Shipments with Timeline, Booking, and Tracking Events ---
    const enhancedShipments: any[] = []

    for (const shipment of validShipments) {
      if (!shipment) continue

      // a. PAL Timeline
      let timelineData: any = null
      try {
        const { data: timelines } = await query.graph({
          entity: "pal_shipment_timeline",
          fields: ["id", "scenario", "steps.*"],
          filters: { shipment_id: shipment.id }
        })
        if (timelines && timelines.length > 0) {
          const t = timelines[0] as any
          t.steps = (t.steps || []).sort((a: any, b: any) => a.step_order - b.step_order)
          // Map to customer friendly format, stripping internal config
          timelineData = {
            scenario: t.scenario,
            steps: t.steps.map((step: any) => ({
              key: step.step_code,
              label: step.step_name, // e.g., "Order Confirmed"
              status: step.status, // "AVAILABLE", "IN_PROGRESS", "COMPLETED", "LOCKED"
              updatedAt: step.updated_at
            }))
          }
        }
      } catch (err) {
        console.warn(`[CustomerTrackingAPI] Failed to fetch timeline for shipment ${shipment.id}`, err)
      }

      // b. PAL Active Booking
      let activeBooking: any = null
      try {
        const bookings = await (palService as any).listPalProviderBookings({
          shipment_id: shipment.id
        })
        if (bookings && bookings.length > 0) {
          // Find the latest active booking based on created_at
          const latest = bookings.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ).pop()
          activeBooking = {
            status: latest.status,
            trackingNumber: latest.external_booking_id !== "NOT_BOOKED" ? latest.external_booking_id : null
          }
        }
      } catch (err) {
        console.warn(`[CustomerTrackingAPI] Failed to fetch booking for shipment ${shipment.id}`, err)
      }

      // c. PAL Tracking Events
      let trackingEvents: any[] = []
      try {
        const events = await (palService as any).listPalTrackingEvents({
          shipment_id: shipment.id
        })
        if (events && events.length > 0) {
          // Sort newest first
          const sorted = events.sort((a: any, b: any) => 
            new Date(b.event_at).getTime() - new Date(a.event_at).getTime()
          )
          trackingEvents = sorted.map((evt: any) => ({
            status: evt.normalized_status,
            description: evt.description,
            location: evt.location,
            timestamp: evt.event_at
          }))
        }
      } catch (err) {
        console.warn(`[CustomerTrackingAPI] Failed to fetch tracking events for shipment ${shipment.id}`, err)
      }

      // Build customer-safe shipment DTO
      enhancedShipments.push({
        shipmentId: shipment.id,
        scenario: timelineData?.scenario || null,
        currentStatus: activeBooking?.status || shipment.status,
        timeline: timelineData?.steps || [],
        carrier: {
          name: shipment.selected_provider_id, // We keep the ID which acts as the name (e.g. shiprocket, dhl)
          trackingNumber: activeBooking?.trackingNumber || null
        },
        tracking: {
          events: trackingEvents
        }
      })
    }

    return res.status(200).json({
      order: {
        displayId: order.display_id
      },
      shipments: enhancedShipments
    })

  } catch (error: any) {
    console.error("❌ Fatal API Error in Customer Tracking:", error.message)
    // Never expose stack traces or raw backend exceptions
    return res.status(500).json({ message: "We're unable to load tracking information right now. Please try again later." })
  }
}
