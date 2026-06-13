import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// Step A: Create the Farm profile in your custom database
export const createVendorProfileStep = createStep(
  "create-vendor-profile-step",
  async (input: { farm_name: string; email: string }, { container }) => { 
    const vendorService = container.resolve("vendor")
    
    // 🟢 Generate a clean, lowercase URL slug from the farm name
    const generatedHandle = input.farm_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
      .replace(/(^-|-$)+/g, '')    // Remove trailing or leading hyphens

    const vendor = await vendorService.createVendors({ 
      name: input.farm_name,
      email: input.email,
      handle: generatedHandle, // 🟢 Pass the generated handle to the database!
      commission_rate: 15,
      is_active: false
    })
    return new StepResponse(vendor)
  }
)

// Step B: Create the Medusa Admin User
export const createVendorUserStep = createStep(
  "create-vendor-user-step",
  async (input: { email: string }, { container }) => {
    const userService = container.resolve("user")
    
    // We explicitly create the Admin User profile to match the Auth Password!
    const user = await userService.createUsers({ 
      email: input.email 
    })
    
    return new StepResponse(user)
  }
)

// Step C: Build the Invisible Bridge
export const linkVendorToUserStep = createStep(
  "link-vendor-to-user-step",
  async (input: { userId: string, vendorId: string }, { container }) => {
    const remoteLink = container.resolve("remoteLink")
    
    // 🟢 Wrap the payload in an array [] and use Modules.USER
    await remoteLink.create([
      {
        [Modules.USER]: { user_id: input.userId },
        "vendor": { vendor_id: input.vendorId }
      }
    ])
    
    return new StepResponse({ success: true })
  }
)

export const linkUserToAuthStep = createStep(
  "link-user-to-auth-step",
  async (input: { email: string; userId: string }, { container }) => {
    const authService = container.resolve(Modules.AUTH)

    // 1. Find the Auth Identity (Password record) that the Next.js form just created
    const providers = await authService.listProviderIdentities({
      entity_id: input.email
    })

    if (!providers || providers.length === 0) {
      throw new Error("Could not find the Auth Password record for this email.")
    }

    const authIdentityId = providers[0].auth_identity_id

    // 2. Bridge them together by stamping the User ID into the Auth Identity's metadata
    await authService.updateAuthIdentities([{
      id: authIdentityId,
      app_metadata: { 
        user_id: input.userId 
      }
    }])

    return new StepResponse({ success: true })
  }
)