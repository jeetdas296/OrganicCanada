import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { 
  createPalShipmentStep, 
  classifyTradeStep, 
  determineModeStep, 
  customsCheckStep,
  selectProviderStep, 
  bookProviderStep, 
  updateShipmentStatusStep,
  generateTimelineStep 
} from "./steps"

export const processPalShipmentWorkflowId = "process-pal-shipment"

export const processPalShipmentWorkflow = createWorkflow(
  processPalShipmentWorkflowId,
  (input: { 
    orderId: string, 
    fulfillmentId?: string, 
    items: any[], 
    packages: any[],
    originStockLocationAddress: any,
    destinationShippingAddress: any,
    orderType: string
  }) => {
    
    // Step 1: Create Shipment Context from Medusa payload
    const shipmentContext = createPalShipmentStep(input)
    
    // Step 2: Classify Trade (DOMESTIC/CROSS_BORDER, EXPORT/IMPORT)
    const classifiedContext = classifyTradeStep(shipmentContext)
    
    // Step 3: Determine Transport Mode (PARCEL/LTL/FTL/AIR/OCEAN)
    const modeContext = determineModeStep(classifiedContext)

    // Step 4: Customs Engine evaluates documentation needs
    const customsContext = customsCheckStep(modeContext)
    
    // Step 4.5: Generate Timeline now that scenario details are fully determined
    const timelineContext = generateTimelineStep(customsContext)
    
    // Step 5: Select Provider from Registry based on context
    const providerSelection = selectProviderStep(timelineContext)
    
    // Step 5: Book Provider (generates tracking)
    const booking = bookProviderStep(providerSelection)
    
    // Step 6: Update Shipment Status (validates transition and persists)
    const statusUpdate = updateShipmentStatusStep({
      shipmentId: shipmentContext.shipmentId as any,
      providerId: booking.providerId,
      trackingNumber: booking.trackingNumber,
      status: booking.status
    })
    
    return new WorkflowResponse({
      booking,
      statusUpdate
    })
  }
)
