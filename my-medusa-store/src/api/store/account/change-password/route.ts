import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { current_password, new_password, confirm_password } = req.body as any

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ message: "current_password, new_password, and confirm_password are required." })
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ message: "New password and confirm password do not match." })
  }

  if (new_password === current_password) {
    return res.status(400).json({ message: "New password must be different from current password." })
  }

  // 1. Ensure the user is authenticated and get their Auth Identity ID
  const authContext = (req as any).auth_context
  if (!authContext || !authContext.actor_id) {
    return res.status(401).json({ message: "Unauthorized. Please log in first." })
  }

  // Medusa v2 stores the actor's ID and auth_identity_id in the auth_context
  const authIdentityId = authContext.auth_identity_id || authContext.app_metadata?.auth_identity_id

  const authService = req.scope.resolve(Modules.AUTH)

  try {
    // If the authContext directly provides the identity, use it. Otherwise, we might need to find it by actor_id.
    let targetAuthIdentityId = authIdentityId

    if (!targetAuthIdentityId) {
       // If auth_identity_id isn't directly on context, find the auth identity that belongs to this customer
       const authIdentities = await authService.listAuthIdentities({
         app_metadata: {
           customer_id: authContext.actor_id
         }
       })
       
       if (!authIdentities || authIdentities.length === 0) {
          return res.status(401).json({ message: "No authentication identity found for this user." })
       }
       targetAuthIdentityId = authIdentities[0].id
    }

    // 2. Find the 'emailpass' provider identity linked to this Auth Identity
    const providerIdentities = await authService.listProviderIdentities({
      auth_identity_id: targetAuthIdentityId,
      provider: "emailpass"
    })

    if (!providerIdentities || providerIdentities.length === 0) {
      return res.status(400).json({ message: "User does not use a password for authentication." })
    }

    const emailpassIdentity = providerIdentities[0]

    // 3. Verify the current password
    // We use the entity_id (which is usually the email for emailpass provider) to authenticate
    const authResult = await authService.authenticate("emailpass", {
      url: "",
      headers: {},
      query: {},
      body: {
        email: emailpassIdentity.entity_id,
        password: current_password
      },
      protocol: "http",
      method: "POST"
    } as any)

    if (!authResult || !authResult.success) {
      return res.status(400).json({ message: "Invalid current password." })
    }

    // 4. Update the password using the native provider update method
    const updateResult = await authService.updateProvider("emailpass", {
      entity_id: emailpassIdentity.entity_id,
      password: new_password
    })

    if (!updateResult || !updateResult.success) {
      return res.status(400).json({ message: updateResult?.error || "Failed to update password." })
    }

    return res.status(200).json({ success: true, message: "Password changed successfully." })
  } catch (error: any) {
    console.error("❌ [Change Password] Error:", error.message)
    return res.status(500).json({ message: "An error occurred while changing the password." })
  }
}
