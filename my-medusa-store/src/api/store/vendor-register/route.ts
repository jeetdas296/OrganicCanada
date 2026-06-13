import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { vendorRegistrationWorkflow } from "../../../workflows/vendor-registration"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, farm_name } = req.body as { email: string; farm_name: string }

  if (!email || !farm_name) {
    return res.status(400).json({ message: "Email and Farm Name are required." })
  }

  try {
    // Fire the workflow we just built
    const { result } = await vendorRegistrationWorkflow(req.scope).run({
      input: { email, farm_name }
    })

    console.log(`🎉 New Vendor Registered: ${result.vendor.name} (${result.user.email})`)

    res.status(200).json({ 
      message: "Application submitted successfully! Awaiting Admin approval.",
      vendor_id: result.vendor.id
    })
    
  } catch (error: any) {
    console.error("🛑 Vendor Registration Failed:", error.message)
    res.status(500).json({ message: "Failed to register vendor." })
  }
}