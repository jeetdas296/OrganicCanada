import { PalFulfillmentProviderService } from "../../services/pal-fulfillment-provider"
import { MedusaApp } from "@medusajs/modules-sdk"
import { Modules } from "@medusajs/framework/utils"
const config = require("../../../../../medusa-config")

describe("Medusa Provider Registration", () => {
  it("Verify PalFulfillmentProviderService identifier is 'organic_canada'", () => {
    expect(PalFulfillmentProviderService.identifier).toBe("organic_canada")
  })

  it("Verify organic_canada is registered in medusa-config modules", async () => {
    // If not, Medusa cannot resolve the provider for OMS fulfillments
    const modulesList = Array.isArray(config.modules) ? config.modules : Object.values(config.modules || {})
    const fulfillmentModuleConf = modulesList.find(
      (m: any) => m.resolve === "@medusajs/fulfillment"
    ) as any

    expect(fulfillmentModuleConf).toBeDefined()
    
    const providers = fulfillmentModuleConf.options?.providers
    expect(providers).toBeDefined()

    const organicCanadaProvider = providers.find((p: any) => p.id === "organic_canada")
    expect(organicCanadaProvider).toBeDefined()
    expect(organicCanadaProvider.resolve).toContain("fulfillment-pal")
  })
})
