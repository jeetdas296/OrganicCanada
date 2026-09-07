import { init } from "@medusajs/framework"
import { fulfillOrderWorkflow, createDraftOrderWorkflow } from "../src/workflows/order-management"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

async function run() {
  console.log("Initializing Medusa...")
  const { container } = await init()
  
  const query = container.resolve("query")
  
  // 1. Find a DK Stock Location
  console.log("Finding DK Stock Location...")
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "address.country_code"],
    filters: {
      address: { country_code: "DK" }
    }
  })
  
  let dkLocation = locations[0]
  if (!dkLocation) {
    console.log("No DK location found, using first available...")
    const { data: anyLocations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "address.country_code"],
    })
    dkLocation = anyLocations[0]
  }
  
  if (!dkLocation) {
    throw new Error("No stock locations found in DB")
  }
  console.log("Using Stock Location:", dkLocation.id, "Country:", dkLocation.address?.country_code)

  // 2. Find an Order with a DK Shipping Address
  console.log("Finding DK Order...")
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "shipping_address.country_code", "items.*"],
    filters: {
      shipping_address: { country_code: "DK" },
      status: "pending"
    }
  })
  
  let dkOrder = orders[0]
  if (!dkOrder) {
    console.log("No pending DK order found, using first available...")
    const { data: anyOrders } = await query.graph({
      entity: "order",
      fields: ["id", "shipping_address.country_code", "items.*"],
      filters: { status: "pending" }
    })
    dkOrder = anyOrders[0]
  }
  
  if (!dkOrder) {
    throw new Error("No pending orders found in DB")
  }
  console.log("Using Order:", dkOrder.id, "Country:", dkOrder.shipping_address?.country_code)

  const itemsToFulfill = dkOrder.items.map((i: any) => ({
    item_id: i.id,
    quantity: 1
  }))

  // 3. Trigger Fulfillment Workflow
  console.log("Triggering fulfillOrderWorkflow...")
  try {
    const { result } = await fulfillOrderWorkflow(container).run({
      input: {
        orderId: dkOrder.id,
        locationId: dkLocation.id,
        items: itemsToFulfill,
        providerId: "organic_canada"
      }
    })
    
    console.log("Fulfillment created successfully:", result.fulfillment.id)
  } catch (err: any) {
    console.error("Workflow failed:", err.message)
    if (err.errors) {
      console.error(err.errors)
    }
  }
  
  process.exit(0)
}

run().catch(console.error)
