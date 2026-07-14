import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.params.id
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  try {
    // 1. Fetch the Customer
    const customer = await customerService.retrieveCustomer(customerId)

    // 2. Update their metadata to "approved"
    const currentMetadata = customer.metadata || {}
    await (customerService as any).updateCustomers({
      id: customerId,
      metadata: {
        ...currentMetadata,
        b2b_status: "approved"
      }
    })

    // 3. Find or Create the "B2B Wholesale" Customer Group
    const groups = await customerService.listCustomerGroups({ name: "B2B Wholesale" })
    let b2bGroupId: string

    if (groups.length === 0) {
      const newGroup = await customerService.createCustomerGroups({
        name: "B2B Wholesale",
      })
      b2bGroupId = newGroup.id
    } else {
      b2bGroupId = groups[0].id
    }

    // 4. Add the Customer to the Wholesale Group!
    // In Medusa v2, we link customers to groups by passing an array of customer IDs
    await customerService.addCustomerToGroup({
        customer_id: customerId,
        customer_group_id: b2bGroupId
    })

    console.log(`✅ B2B Application Approved: [REDACTED]`)
    
    res.status(200).json({ success: true, message: "Wholesaler Approved & Grouped!" })

  } catch (error: any) {
    console.error("❌ Failed to approve B2B application:", error.message)
    res.status(500).json({ message: "Internal server error during approval." })
  }
}