import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../../modules/fulfillment-pal"
import { getRequiredDocuments } from "../../../../../../../modules/fulfillment-pal/core/document-requirements"

function validateStepConfiguration(stepCode: string, config: any): { valid: boolean; error?: string } {
  if (!config) return { valid: false, error: "Configuration object is missing" }

  const requireFields = (fields: string[]) => {
    for (const f of fields) {
      if (config[f] === undefined || config[f] === null || config[f] === "") {
        return { valid: false, error: `Missing required field: ${f}` }
      }
    }
    return { valid: true }
  }

  switch (stepCode) {
    case "ORDER_CONFIRMED":
      return requireFields(["confirmation_date", "order_reference", "confirmed_by"])
    case "PICKING":
      return requireFields(["warehouse", "picker", "quantity_picked", "picking_date"])
    case "PACKING":
      return requireFields(["package_count", "package_type", "dimensions", "weight", "weight_unit", "packed_by", "packing_date"])
    case "EXPORT_DOCUMENTATION":
      return requireFields(["document_type", "document_number", "document_date", "expiry_date", "document_reference"])
    case "CUSTOMS_PREPARATION":
      return requireFields(["hs_code", "country_of_origin", "declared_value", "currency", "incoterm", "customs_reference", "preparation_date", "prepared_by"])
    case "COMMERCIAL_INVOICE":
      return requireFields(["invoice_number", "invoice_date", "seller", "buyer", "currency", "subtotal", "tax", "total_value"])
    case "PACKING_LIST":
      return requireFields(["package_count", "dimensions", "weight", "weight_unit", "contents", "package_reference", "packing_date", "prepared_by"])
    case "CERTIFICATE_OF_ORIGIN":
      return requireFields(["origin_country", "certificate_number", "issue_date", "issuing_authority", "document_reference"])
    case "FREIGHT_PLANNING":
      return requireFields(["transport_mode", "pickup_date", "delivery_target", "forwarder_reference", "instructions", "planned_by"])
    case "PICKUP_SCHEDULED":
      return requireFields(["pickup_date", "pickup_window_start", "pickup_window_end", "pickup_location", "contact_person", "instructions", "scheduled_by"])
    case "SHIPMENT_BOOKED":
      return requireFields(["booking_reference", "booking_date", "service", "confirmation_reference", "booked_by"])
    case "IN_TRANSIT":
      return requireFields(["departure_date", "origin", "destination", "tracking_reference", "estimated_arrival", "carrier_reference"])
    case "CUSTOMS_CLEARED":
      return requireFields(["clearance_date", "customs_reference", "clearance_status", "duty_amount", "tax_amount", "currency", "cleared_by"])
    case "DELIVERED":
      return requireFields(["delivery_date", "delivery_time", "recipient", "proof_of_delivery_reference", "delivered_by"])
    default:
      return { valid: true }
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  const { shipmentId, step: stepCode } = req.params
  const configuration = req.body as any

  if (!shipmentId || !stepCode) {
    return res.status(400).json({ message: "Shipment ID and Step Code are required" })
  }

  // 1. Resolve logged-in Vendor (if any) and check auth
  let activeVendorId: string | null = null
  const authContext = (req as any).auth_context
  const actorId = authContext?.actor_id

  if (actorId) {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: actorId }
    })
    activeVendorId = users[0]?.vendor?.id || null
  }

  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "order_type",
      "transport_mode",
      "incoterm",
      "trade_classifier",
      "timelines.*",
      "timelines.steps.*"
    ],
    filters: { id: shipmentId }
  })

  const shipment = palShipments[0]
  if (!shipment) {
    return res.status(404).json({ message: "Shipment not found" })
  }

  // Auth logic
  if (activeVendorId) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["items.variant.product.vendor.id"],
      filters: { id: shipment.order_id }
    })
    const orderItems = orders[0]?.items || []
    const vendorItems = orderItems.filter((i: any) => (i?.variant?.product?.vendor?.id || "platform_direct") === activeVendorId)
    if (vendorItems.length === 0) {
      return res.status(403).json({ message: "Unauthorized" })
    }
  }

  const timeline = (shipment as any).timelines?.[0]
  if (!timeline || !timeline.steps) {
    return res.status(404).json({ message: "Timeline not found for shipment" })
  }

  const steps = [...timeline.steps].sort((a: any, b: any) => a.step_order - b.step_order)
  
  const currentStepIndex = steps.findIndex((s: any) => s.step_code === stepCode)
  if (currentStepIndex === -1) {
    return res.status(404).json({ message: `Step ${stepCode} not found in timeline` })
  }

  const currentStep = steps[currentStepIndex]
  
  if (currentStep.status === "LOCKED") {
    return res.status(400).json({ message: "Cannot configure a locked step. Complete previous steps first." })
  }

  // Validate Configuration
  const validation = validateStepConfiguration(stepCode, configuration)
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error })
  }

  // --- Document Compliance Validation ---
  const reqs = getRequiredDocuments({
    orderType: shipment.order_type as any,
    tradeType: (shipment as any).trade_classifier === "DOMESTIC" ? "DOMESTIC" : "CROSS_BORDER",
    transportMode: shipment.transport_mode as string | undefined,
    incoterm: shipment.incoterm as string | undefined
  })

  // We map stepCode 1:1 to document_type where applicable
  const stepRequirement = reqs.find(r => r.document_type === stepCode)
  if (stepRequirement && stepRequirement.required) {
    const { data: docs } = await query.graph({
      entity: "pal_document",
      fields: ["id", "type", "status"],
      filters: { timeline_step_id: currentStep.id, type: stepCode } as any
    })
    
    const isUploaded = docs.some((d: any) => d.status === "UPLOADED")
    const isSkipped = configuration.document_status === "NOT_AVAILABLE"
    
    if (!isUploaded && !isSkipped) {
      return res.status(400).json({ code: "DOCUMENT_REQUIRED", message: `${stepCode.replace(/_/g, " ")} is required before completing this step.` })
    }
    
    if (isSkipped && (!configuration.not_available_reason || configuration.not_available_reason.trim() === "")) {
      return res.status(400).json({ code: "DOCUMENT_REASON_REQUIRED", message: "A reason is mandatory when skipping a required document." })
    }
  }

  // Update current step to COMPLETED
  await (palService as any).updatePalShipmentTimelineSteps({
    id: currentStep.id,
    configuration,
    status: "COMPLETED",
    completed_at: new Date(),
    completed_by: activeVendorId ? `Vendor ${activeVendorId}` : "Admin"
  })

  // Unlock next step
  if (currentStepIndex + 1 < steps.length) {
    const nextStep = steps[currentStepIndex + 1]
    if (nextStep.status === "LOCKED") {
      await (palService as any).updatePalShipmentTimelineSteps({
        id: nextStep.id,
        status: "AVAILABLE",
        started_at: new Date()
      })
    }
  }

  return res.json({ success: true })
}
