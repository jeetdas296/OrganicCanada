import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { deductBundleInventoryWorkflow } from "../workflows/deduct-bundle-inventory"

// This completely isolated subscriber handles only Bundle Component Inventory Deduction
export default async function bundleInventoryDeductionHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`📦 [BUNDLE-INVENTORY] Order ${data.id} placed! Checking for bundles...`)
  
  // Trigger the workflow for inventory deduction
  await deductBundleInventoryWorkflow(container).run({
    input: data.id,
  })
}

// Subscribe to the core Medusa order.placed event
export const config: SubscriberConfig = {
  event: "order.placed",
}
