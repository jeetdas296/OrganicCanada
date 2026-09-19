import { init } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { resolve } from "path"

async function run() {
  const directory = resolve(process.cwd())
  const { container } = await init({
    directory,
    shouldStartServer: false,
  })

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  
  // Use a known fulfillment ID mentioned by user
  const id = "ful_01M0S52RWSEEYNAW2D6EVGV51"

  console.log("Looking up fulfillment:", id)

  try {
    const fulfillments = await fulfillmentService.listFulfillments(
      { id },
      { relations: ["items"] }
    )
    
    console.log("Fulfillment found:", fulfillments.length)
    if (fulfillments.length > 0) {
      const ful = fulfillments[0]
      console.log("Fulfillment items:", ful.items?.length)
      if (ful.items?.length > 0) {
        console.log("First item:", JSON.stringify(ful.items[0], null, 2))
      }
    }
  } catch (err) {
    console.error("Error fetching fulfillment:", err)
  }

  process.exit(0)
}

run()
