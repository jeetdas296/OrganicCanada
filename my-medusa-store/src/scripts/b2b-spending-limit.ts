import { ExecArgs } from "@medusajs/framework/types"

export default async function setSpendingLimit({ container }: ExecArgs) {
  const customerService = container.resolve("customerModuleService") as any
  
  const customerId = process.argv[3] 
  const limit = parseInt(process.argv[4] || "0")

  if (!customerId || isNaN(limit)) {
    console.error("Usage: npx medusa exec src/scripts/b2b-spending-limit.ts <customer_id> <limit>")
    process.exit(1)
  }

  try {
    await customerService.updateCustomers({
      id: customerId,
      metadata: {
        spending_limit: limit
      }
    })
    console.log(`✅ Successfully updated spending limit for customer ${customerId} to ${limit}`)
  } catch (error: any) {
    console.error("❌ Error updating customer:", error.message)
  }
}
