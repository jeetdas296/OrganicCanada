import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { ProviderRegistry, ProviderRouter } from "../../core"
import { CanadaPostAdapter, FedExFreightAdapter, FlexportAdapter } from "../../providers/adapters"
import { OrganicCanadaProviderService } from "../../providers/organic-canada"
import { FULFILLMENT_PAL_MODULE } from "../../index"
import { organicCanadaConfig } from "../../providers/organic-canada/config"

export const selectProviderStepId = "select-provider-step"

export const selectProviderStep = createStep(
  selectProviderStepId,
  async (context: ShipmentContext, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)

    // 1. Fetch provider configuration from database
    const providers = await palService.listPalProviders({ code: "ORGANIC_CANADA" })
    
    // Seed/fallback to environment defaults
    let dbConfig = providers[0]?.configuration
    if (!dbConfig) {
      dbConfig = { carriers: organicCanadaConfig.carriers }
    }

    let logger: any
    try {
      logger = container.resolve("logger")
    } catch (e) {
      logger = console
    }
    
    // Log shipment context details for debugging routing decisions
    logger.info(`[PAL Routing Debug] Evaluating shipment routing context:
- order_type: ${context.orderType}
- trade_type: ${context.tradeType}
- trade_direction: ${context.tradeDirection}
- transport_mode: ${context.transportMode}
- origin_country: ${context.origin?.countryCode}
- destination_country: ${context.destination?.countryCode}
- vendor_id: ${context.vendorId}
- weight: ${context.packages?.reduce((acc, p) => acc + (p.weight || 0), 0) || 0}
- package count: ${context.packages?.length || 0}`)

    const registry = new ProviderRegistry()

    // 2. Register Organic Canada provider with database-derived capabilities
    const organicCanadaProvider = new OrganicCanadaProviderService(dbConfig)
    const derivedCaps = organicCanadaProvider.getDerivedCapabilities()

    if (providers[0]?.enabled !== false) {
      registry.register({
        id: "organic_canada",
        code: "ORGANIC_CANADA",
        name: "Organic Canada Logistics",
        priority: providers[0]?.priority || 1,
        adapter: organicCanadaProvider,
        capabilities: derivedCaps
      })
    } else {
      logger.warn(`[PAL Routing] Organic Canada provider is disabled in database configuration.`)
    }
    
    // 3. Register mock/test providers (retained for compatibility, marked as TEST ONLY)
    registry.register({
      id: "canada-post",
      code: "cp",
      name: "Canada Post (MOCK - TEST ONLY)",
      priority: 10,
      adapter: new CanadaPostAdapter(),
      capabilities: {
        transportModes: ["PARCEL"],
        domestic: true,
        crossBorder: false,
        rating: true, booking: true, tracking: true, label: true, customs: false
      }
    })
    
    registry.register({
      id: "fedex-freight",
      code: "fxfrt",
      name: "FedEx Freight (MOCK - TEST ONLY)",
      priority: 20,
      adapter: new FedExFreightAdapter(),
      capabilities: {
        transportModes: ["LTL", "FTL"],
        domestic: true,
        crossBorder: true,
        rating: true, booking: true, tracking: true, label: true, customs: true
      }
    })

    registry.register({
      id: "flexport",
      code: "flx",
      name: "Flexport (MOCK - TEST ONLY)",
      priority: 30,
      adapter: new FlexportAdapter(),
      capabilities: {
        transportModes: ["OCEAN_LCL", "OCEAN_FCL", "AIR_FREIGHT"],
        domestic: false,
        crossBorder: true,
        rating: true, booking: true, tracking: true, label: true, customs: true
      }
    })

    // 4. Delegate routing to existing ProviderRouter
    const router = new ProviderRouter(registry)
    const selectedProvider = router.route(context)

    logger.info(`[PAL Routing Debug] Routing selection result:
- selected provider: ${selectedProvider?.id || "None"}
- provider capabilities: ${selectedProvider ? JSON.stringify(selectedProvider.capabilities) : "N/A"}`)

    if (!selectedProvider) {
      throw new Error("No capable provider found for this shipment context")
    }

    // Persist selected provider ID in database
    await palService.updatePalShipments({
      id: context.shipmentId,
      selected_provider_id: selectedProvider.id
    })
    
    return new StepResponse({
      context,
      providerId: selectedProvider.id
    })
  }
)
