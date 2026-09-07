import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../modules/fulfillment-pal"
import { OrganicCanadaProviderService } from "../../../../../../modules/fulfillment-pal/providers/organic-canada/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  const shipmentId = req.params.shipmentId

  if (!shipmentId) {
    return res.status(400).json({ message: "Shipment ID required" })
  }

  // Auth logic
  let activeVendorId: string | null = null
  const authContext = (req as any).auth_context
  if (authContext?.actor_id) {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: authContext.actor_id }
    })
    activeVendorId = users[0]?.vendor?.id || null
  }

  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "selected_provider_id",
      "selected_service_id",
      "order_type",
      "trade_type",
      "transport_mode",
      "timelines.*",
      "timelines.steps.*"
    ],
    filters: { id: shipmentId }
  })

  const shipment = palShipments[0]
  if (!shipment) {
    return res.status(404).json({ message: "Shipment not found" })
  }

  if (activeVendorId) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["items.variant.product.vendor.id"],
      filters: { id: shipment.order_id }
    })
    const vendorItems = (orders[0]?.items || []).filter((i: any) => (i?.variant?.product?.vendor?.id || "platform_direct") === activeVendorId)
    if (vendorItems.length === 0) {
      return res.status(403).json({ message: "Unauthorized" })
    }
  }

  const carrierId = shipment.selected_provider_id
  if (!carrierId) {
    return res.status(400).json({ message: "No carrier selected for this shipment yet." })
  }

  // 2. Fetch Packages
  let packages: any[] = []
  try {
    const { data: pkgs } = await query.graph({
      entity: "pal_package",
      fields: ["id", "package_type", "weight", "weight_unit", "quantity", "length", "width", "height", "dimension_unit"],
      filters: { shipment_id: shipmentId }
    })
    packages = pkgs
  } catch (err) {}

  const context: any = {
    shipmentId: shipment.id,
    orderId: shipment.order_id,
    orderType: shipment.order_type,
    tradeType: shipment.trade_type,
    transportMode: shipment.transport_mode,
    origin: { countryCode: "CA", city: "Toronto", postalCode: "M5V2T6" },
    destination: { countryCode: "US", city: "New York", postalCode: "10001" },
    packages: packages.map(p => ({
      weight: Number(p.weight) || 1,
      length: Number(p.length) || 10,
      width: Number(p.width) || 10,
      height: Number(p.height) || 10,
      quantity: Number(p.quantity) || 1
    })),
    metadata: {
      selected_service_id: shipment.selected_service_id,
      preferredProviders: [carrierId] // Force the router to select this carrier
    }
  }

  const dbProviders = await (palService as any).listPalProviders({ code: "ORGANIC_CANADA" })
  const dbProviderId = dbProviders[0]?.id

  const provider = new OrganicCanadaProviderService()
  // Wait, we need to explicitly book using the actual route method we wrote in OrganicCanadaProviderService
  // Since bookShipment is protected in AbstractPalProviderAdapter, we can either call the Carrier directly
  // or expose it. Let's get the carrier directly.
  const carrier = provider.routeCarrier(context)

  if (!carrier || carrier.getIdentifier() !== carrierId) {
    return res.status(400).json({ message: `Carrier ${carrierId} is not available or configured properly.` })
  }

  // IDEMPOTENCY CHECK
  const { data: existingBookings } = await query.graph({
    entity: "pal_provider_booking",
    fields: ["*"],
    filters: { shipment_id: shipment.id, status: "BOOKED" }
  })
  
  if (existingBookings && existingBookings.length > 0) {
    const existing = existingBookings[0]
    return res.json({ 
      success: true, 
      status: "BOOKED", 
      details: existing.response_payload,
      idempotent: true
    })
  }

  // CONCURRENCY LOCK (Optimistic via timeline step)
  const timeline = (shipment as any).timelines?.[0]
  let bookingStep: any = null
  if (timeline?.steps) {
    bookingStep = timeline.steps.find((s: any) => s.step_code === "SHIPMENT_BOOKED" || s.step_code === "BOOKING")
    if (bookingStep) {
      if (bookingStep.status === "IN_PROGRESS") {
        return res.status(409).json({ message: "Booking is currently in progress. Please wait." })
      }
      // Lock it
      await (palService as any).updatePalShipmentTimelineSteps({
        id: bookingStep.id,
        status: "IN_PROGRESS"
      })
    }
  }

  let bookingResult: any = null
  let status = "NOT_BOOKED"
  let responsePayload: any = {}

  try {
    bookingResult = await carrier.bookShipment(context)
    status = "BOOKED"
    responsePayload = { 
      cost: bookingResult?.cost, 
      trackingNumber: bookingResult?.trackingNumber,
      labels: bookingResult?.labels
    }
  } catch (error: any) {
    console.error("Booking failed:", error.message)
    
    // Unlock step on failure
    if (bookingStep) {
      await (palService as any).updatePalShipmentTimelineSteps({
        id: bookingStep.id,
        status: "AVAILABLE"
      })
    }
    
    if (error.message?.includes("NOT_CONFIGURED") || error.message?.includes("PROVIDER_NOT_CONFIGURED")) {
      status = "NOT_BOOKED"
      responsePayload = { error: "Carrier credentials not configured. Booking failed." }
    } else {
      // Normalize Error
      const normalizedError = {
        code: "PROVIDER_UNAVAILABLE",
        message: "An unknown error occurred",
        field: null as string | null,
        status: 500,
        providerMessage: error.message
      }
      
      if (error.name === "DhlApiError") {
        normalizedError.code = error.normalizedCode || "API_ERROR"
        normalizedError.status = error.status || 500
        
        const dhlDetail = error.details?.detail || error.details?.title
        if (dhlDetail) normalizedError.message = dhlDetail
        
        if (error.details?.additionalDetails && Array.isArray(error.details.additionalDetails)) {
            const firstDetail = error.details.additionalDetails[0]
            if (firstDetail) {
                normalizedError.message = `${firstDetail.message || dhlDetail}`
                normalizedError.field = firstDetail.source || null
            }
        }
      } else {
        normalizedError.message = error.message
      }
      
      return res.status(normalizedError.status || 500).json({ 
        message: "Booking failed", 
        error: normalizedError.code,
        details: normalizedError
      })
    }
  }

  await (palService as any).createPalProviderBookings({
    shipment_id: shipment.id,
    provider_id: dbProviderId, 
    external_booking_id: bookingResult?.trackingNumber || "NOT_BOOKED",
    external_shipment_id: bookingResult?.trackingNumber || "NOT_BOOKED",
    status,
    response_payload: responsePayload,
    booked_at: status === "BOOKED" ? new Date() : undefined
  })

  // Update timeline step 'SHIPMENT_BOOKED' or 'BOOKING'
  if (bookingStep) {
    await (palService as any).updatePalShipmentTimelineSteps({
      id: bookingStep.id,
      status: status === "BOOKED" ? "COMPLETED" : "AVAILABLE",
      configuration: { booking: responsePayload },
      completed_at: status === "BOOKED" ? new Date() : null
    })
  }

  return res.json({ success: true, status, details: responsePayload })
}
