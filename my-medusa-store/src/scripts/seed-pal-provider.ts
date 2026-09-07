import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function seedPalProvider({ container }: ExecArgs) {
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const link = container.resolve("link")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  try {
    const providers = await fulfillmentModule.listFulfillmentProviders()
    logger.info(`Fulfillment Providers available in Module: ${providers.map((p: any) => p.id).join(", ")}`)
    
    if (!providers.find((p: any) => p.id === "organic_canada_organic_canada")) {
      logger.error("organic_canada_organic_canada not found in Fulfillment Module. Exiting.")
      return
    }

    const { data: locs } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "fulfillment_providers.*"]
    })

    const intendedLocations = ["European Warehouse", "OrganicCanada"]
    
    for (const loc of locs) {
      const existingProviders = loc.fulfillment_providers?.map((p: any) => p.id) || []
      
      logger.info(`\nLocation: ${loc.name} (${loc.id})`)
      logger.info(`Existing Providers: ${existingProviders.join(", ")}`)

      if (intendedLocations.includes(loc.name)) {
        if (!existingProviders.includes("organic_canada_organic_canada")) {
          // Link it
          await link.create({
            [Modules.STOCK_LOCATION]: {
              stock_location_id: loc.id,
            },
            [Modules.FULFILLMENT]: {
              fulfillment_provider_id: "organic_canada_organic_canada",
            },
          })
          logger.info("New Provider: organic_canada_organic_canada")
          logger.info("Action Taken: LINKED organic_canada_organic_canada (Preserved existing providers)")
        } else {
          logger.info("New Provider: None")
          logger.info("Action Taken: SKIPPED (already linked)")
        }
      } else {
        logger.info("New Provider: None")
        logger.info("Action Taken: SKIPPED (not an intended PAL location)")
      }
    }

  } catch (e) {
    logger.error("Failed to link provider:", e)
  }
}
