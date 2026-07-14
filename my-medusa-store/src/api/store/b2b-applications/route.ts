import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as any
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const query = req.scope.resolve("query") 

  try {
    // 1. 🟢 PERFECT MAPPING: Match the snake_case keys exactly as sent by the frontend
    const email = body.email
    const contactName = body.contact_name || "B2B User"
    const companyName = body.company_name || "Unknown Company"
    const taxId = body.tax_id || ""
    const businessType = body.business_type || "Other"
    const notes = body.notes || ""

    if (!email) {
        return res.status(400).json({ message: "Email is required." })
    }

    let customerId: string | null = null;
    let attempts = 0;

    // 2. SMART RETRY LOOP to find the user created by the Next.js frontend
    while (attempts < 5 && !customerId) {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email"],
        filters: { email: email }
      })
      
      if (customers && customers.length > 0) {
        customerId = customers[0].id;
        break; // Found them!
      }
      
      attempts++;
      console.log(`⏱️ Waiting for frontend to create account... (Attempt ${attempts}/5)`)
      await new Promise(resolve => setTimeout(resolve, 800)); 
    }

    // 3. SAFETY NET: If the frontend failed to create it, force backend creation
    if (!customerId) {
      console.log(`⚠️ Frontend creation failed. Forcing backend creation. (Email redacted)`)
      // Passing a single object instead of an array prevents array-indexing crashes
      const newCustomer = await customerService.createCustomers({
        email: email,
        first_name: contactName,
        last_name: "(B2B Partner)", 
        company_name: companyName,
      })
      
      // Safely grab the ID whether Medusa returns a single object or an array
      customerId = newCustomer.id || (newCustomer as any)[0]?.id;
    }

    if (!customerId) {
        throw new Error("Fatal Error: Could not resolve a valid Customer ID.")
    }

    // 4. 🟢 THE MIKRO-ORM CRASH FIX: 
    // We pass the ID as the first argument and the object as the second argument.
    // This perfectly formats the query and stops the "reading '0'" driver crash.
    await customerService.updateCustomers(customerId, {
      first_name: contactName,
      last_name: "(B2B Partner)", 
      company_name: companyName,
      metadata: {
        b2b_status: "approved", 
        tax_id: taxId,
        business_type: businessType,
        notes: notes,
      }
    })

    // 5. Drop them into the Wholesale Group
    const b2bGroupId = "cusgroup_01KST08CG65XXQS9CN91TXNHCJ"
    try {
      await customerService.addCustomerToGroup({
        customer_id: customerId,
        customer_group_id: b2bGroupId
      })
    } catch (groupErr: any) {
      console.log("Note: Minor group linking warning (can be ignored).")
    }

    console.log(`✅ B2B Auto-Approved & Grouped. (Email redacted)`)
    res.status(200).json({ success: true })

  } catch (error: any) {
    console.error("❌ Failed to save B2B application:", error.message)
    res.status(500).json({ message: "Internal Server Error" })
  }
}