import { MedusaApp } from "@medusajs/framework/modules-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { config } from "dotenv"

config()

async function test() {
  const app = await MedusaApp({
    modulesConfig: {
      "fulfillment-pal": {
        resolve: "./src/modules/fulfillment-pal"
      }
    }
  })
  
  // Actually MedusaApp is complex to set up. Let's just fetch via HTTP against running server!
}
test()
