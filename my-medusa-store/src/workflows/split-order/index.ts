import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { groupOrderItemsStep } from "./steps/group-order-items"
import { createVendorFulfillmentsStep } from "./steps/create-vendor-fulfillments"

// 🟢 THE ORCHESTRATOR: Strings the individual steps together in perfect sequence
export const splitOrderWorkflow = createWorkflow(
  "split-order-workflow",
  (function(input: { orderId: string }) {
    
    // Step 1: Group the items
    const { vendorGroups } = groupOrderItemsStep({ 
      orderId: input.orderId 
    }) as any

    // Step 2: Generate the separate vendor orders based on those groups
    createVendorFulfillmentsStep({ 
      vendorGroups, 
      orderId: input.orderId 
    })

    return new WorkflowResponse({ success: true })
  })
)