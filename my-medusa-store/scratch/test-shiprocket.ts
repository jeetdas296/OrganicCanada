import { ShiprocketAdapter } from "../src/modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket"
import { OrganicCanadaProviderService } from "../src/modules/fulfillment-pal/providers/organic-canada/service"

async function run() {
  console.log("=== Testing Shiprocket Provider Integration ===")
  
  // 1. Test unconfigured adapter
  const adapter = new ShiprocketAdapter({})
  console.log("Status without config:", adapter.getStatus()) // Should be NOT_CONFIGURED
  
  // 2. Test capabilities integration
  const service = new OrganicCanadaProviderService({
    carriers: {
      shiprocket: { status: "CONNECTED" } // Force status for router testing
    }
  })

  const activeAdapters = service.getSubAdapters().filter(a => a.getStatus() === "CONNECTED")
  console.log("Active Adapters in Service:", activeAdapters.map(a => a.getIdentifier()))

  // 3. Test routing a domestic package
  const domesticContext: any = {
    tradeType: "DOMESTIC",
    transportMode: "PARCEL",
    origin: { postalCode: "110020", countryCode: "IN" },
    destination: { postalCode: "110021", countryCode: "IN" },
    packages: [{ weight: 1 }]
  }
  
  const routedCarrier = service.routeCarrier(domesticContext)
  console.log("Routed Carrier for Domestic PARCEL:", routedCarrier ? routedCarrier.getIdentifier() : "None")

  // 4. Test routing a cross-border package (should NOT route to shiprocket based on current config)
  const crossBorderContext: any = {
    tradeType: "CROSS_BORDER",
    transportMode: "PARCEL",
    origin: { postalCode: "110020", countryCode: "IN" },
    destination: { postalCode: "M5V2T6", countryCode: "CA" },
    packages: [{ weight: 1 }]
  }

  const routedCrossBorder = service.routeCarrier(crossBorderContext)
  console.log("Routed Carrier for Cross-Border PARCEL:", routedCrossBorder ? routedCrossBorder.getIdentifier() : "None")
}

run().catch(console.error)
