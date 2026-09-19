import { MedusaContext } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../src/modules/fulfillment-pal"
import { initialize as initPal } from "../src/modules/fulfillment-pal/initialize"

async function run() {
  const palService = await initPal()
  // list shipments
  const shipments = await (palService as any).listPalShipments({}, { relations: ["order"] })
  console.log("Found shipments:", shipments.length)
  for (const s of shipments) {
    console.log(`Shipment ID: ${s.id}, Order ID: ${s.order_id}`)
  }
}

run().catch(console.error)
