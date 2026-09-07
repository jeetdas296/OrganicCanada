import { MedusaApp } from "@medusajs/modules-sdk"
import { Modules } from "@medusajs/framework/utils"
import { resolve } from "path"
import { loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

async function main() {
  const { modules, query } = await MedusaApp({
    sharedResourcesConfig: {
      database: {
        clientUrl: process.env.DATABASE_URL,
      },
    },
    modulesConfig: {
      [Modules.FULFILLMENT]: {
        resolve: "@medusajs/fulfillment",
        options: {
          providers: [
            {
              resolve: "@medusajs/fulfillment-manual",
              id: "manual",
            }
          ]
        }
      },
      [Modules.STOCK_LOCATION]: {
        resolve: "@medusajs/stock-location",
      }
    }
  })

  try {
    const fulfillmentModule = modules[Modules.FULFILLMENT] as any
    const providers = await fulfillmentModule.listFulfillmentProviders()
    console.log("Fulfillment Providers in DB:", providers.map((p: any) => p.id))
    
    // Check links
    const { data: locs } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "fulfillment_providers.*"]
    })
    console.log("Stock Locations and Providers:")
    console.dir(locs, { depth: null })

  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}

main()
