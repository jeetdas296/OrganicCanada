import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FULFILLMENT_PAL_MODULE } from "../../../../modules/fulfillment-pal"
import { organicCanadaConfig } from "../../../../modules/fulfillment-pal/providers/organic-canada/config"
import { DhlAdapter } from "../../../../modules/fulfillment-pal/providers/organic-canada/adapters/dhl"
import { ShiprocketAdapter } from "../../../../modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)

  let providers = await palService.listPalProviders({
    code: "ORGANIC_CANADA"
  })

  let provider
  if (providers.length === 0) {
    provider = await palService.createPalProviders({
      code: "ORGANIC_CANADA",
      name: "Organic Canada Logistics",
      type: "orchestrator",
      enabled: organicCanadaConfig.enabled,
      priority: organicCanadaConfig.priority,
      configuration: {
        carriers: organicCanadaConfig.carriers
      }
    })
  } else {
    provider = providers[0]
  }

  // Merge any missing default carriers from config that aren't yet in the database configuration
  // The database configuration always takes precedence.
  const persistedCarriers = provider.configuration?.carriers || {}
  const mergedCarriers = { 
    ...organicCanadaConfig.carriers, 
    ...persistedCarriers 
  }

  // Sanitize the connection options to never return credentials/secrets
  const sanitizedCarriers = Object.entries(mergedCarriers).map(([id, config]: [string, any]) => {
    const cleanConfig = { ...config }
    if (cleanConfig.options) {
      delete cleanConfig.options.apiKey
      delete cleanConfig.options.api_key
      delete cleanConfig.options.clientSecret
      delete cleanConfig.options.client_secret
      delete cleanConfig.options.token
      delete cleanConfig.options.password
    }
    return {
      id,
      name: id === "shipstation" ? "ShipStation" : id.toUpperCase(),
      status: cleanConfig.status,
      priority: cleanConfig.priority || 0,
      options: cleanConfig.options || {}
    }
  })

  res.json({
    provider: {
      id: provider.id,
      name: provider.name,
      enabled: provider.enabled,
      priority: provider.priority,
      capabilities: ["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]
    },
    carriers: sanitizedCarriers
  })
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  const body = req.body as any

  // 1. Fetch or seed the Organic Canada Logistics provider record
  let providers = await palService.listPalProviders({
    code: "ORGANIC_CANADA"
  })

  let provider
  if (providers.length === 0) {
    provider = await palService.createPalProviders({
      code: "ORGANIC_CANADA",
      name: "Organic Canada Logistics",
      type: "orchestrator",
      enabled: organicCanadaConfig.enabled,
      priority: organicCanadaConfig.priority,
      configuration: {
        carriers: organicCanadaConfig.carriers
      }
    })
  } else {
    provider = providers[0]
  }

  // 2. Build updated configurations
  const currentConfig = provider.configuration || {}
  const newCarriers = { ...(currentConfig.carriers || {}) }

  // 3. Connection Verification Guard
  if (body.configuration?.carriers) {
    for (const [id, carrierConfig] of Object.entries(body.configuration.carriers) as [string, any][]) {
      if (carrierConfig.status === "CONNECTED" || carrierConfig.action === "test") {
        // We need to test the connection
        let AdapterClass: any = null
        if (id === "dhl") {
          AdapterClass = DhlAdapter
        } else if (id === "shiprocket") {
          AdapterClass = ShiprocketAdapter
        }

        if (AdapterClass) {
          // Merge existing config with incoming config to form complete options
          const currentCarrierConfig = currentConfig.carriers?.[id]?.options || {}
          const testOptions = { ...currentCarrierConfig, ...(carrierConfig.options || {}) }
          const adapter = new AdapterClass(testOptions)
          
          if (adapter.testConnection) {
            const testResult = await adapter.testConnection()
            if (testResult.status !== "CONNECTED") {
              return res.status(400).json({
                message: `Connection failed for ${id}: ${testResult.error || "UNKNOWN_ERROR"}`,
                status: testResult.status
              })
            }
          }
        } else {
          return res.status(400).json({
            message: `Carrier ${id} adapter not found for testing.`
          })
        }
        
        // If we reach here, test passed! The status can be CONNECTED
        carrierConfig.status = "CONNECTED"
        // Remove 'action' if it was just a test action
        delete carrierConfig.action
      }
    }
  }



  if (body.configuration?.carriers) {
    for (const [id, carrierConfig] of Object.entries(body.configuration.carriers) as [string, any][]) {
      newCarriers[id] = {
        ...(newCarriers[id] || {}),
        ...carrierConfig
      }
    }
  }

  const updatedProvider = await palService.updatePalProviders({
    id: provider.id,
    enabled: typeof body.enabled === "boolean" ? body.enabled : provider.enabled,
    priority: typeof body.priority === "number" ? body.priority : provider.priority,
    configuration: {
      ...currentConfig,
      carriers: newCarriers
    }
  })

  // 4. Sanitize responses to remove any sensitive configuration settings
  const sanitizedCarriers = Object.entries(updatedProvider.configuration?.carriers || {}).map(([id, config]: [string, any]) => {
    const cleanConfig = { ...config }
    if (cleanConfig.options) {
      delete cleanConfig.options.apiKey
      delete cleanConfig.options.api_key
      delete cleanConfig.options.clientSecret
      delete cleanConfig.options.client_secret
      delete cleanConfig.options.token
      delete cleanConfig.options.password
    }
    return {
      id,
      name: id === "shipstation" ? "ShipStation" : id.toUpperCase(),
      status: cleanConfig.status,
      priority: cleanConfig.priority || 0,
      options: cleanConfig.options || {}
    }
  })

  res.json({
    provider: {
      id: updatedProvider.id,
      name: updatedProvider.name,
      enabled: updatedProvider.enabled,
      priority: updatedProvider.priority,
      capabilities: ["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]
    },
    carriers: sanitizedCarriers
  })
}
