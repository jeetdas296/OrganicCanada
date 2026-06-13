import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
// 🟢 Ensure you are importing createVendorUserStep!
import { createVendorProfileStep, createVendorUserStep, linkVendorToUserStep, linkUserToAuthStep } from "./steps/register-vendor-steps" 

export const vendorRegistrationWorkflow = createWorkflow(
  "vendor-registration-workflow",
  function (input: { email: string; farm_name: string }) {
    
    // 1. Create the Farm Profile
    const vendor = createVendorProfileStep({ 
      farm_name: input.farm_name, 
      email: input.email 
    })
    
    // 2. Create the User Profile
    const user = createVendorUserStep({ email: input.email })
    
    // 3. 🟢 NEW: Link the User Profile to the Auth Password!
    linkUserToAuthStep({ email: input.email, userId: user.id })

    // 4. Link the User Profile to the Vendor Walled Garden
    linkVendorToUserStep({ userId: user.id, vendorId: vendor.id })

    return new WorkflowResponse({ user, vendor })
  }
)