import { ShipmentContext } from "../../../../types"
import { ProviderShipmentResult } from "../../../provider-interface"

export class ShiprocketTestBookingExecutor {
  public async execute(context: ShipmentContext): Promise<ProviderShipmentResult> {
    // Eligibility Checks
    if (context.tradeType !== "DOMESTIC") {
      throw new Error("UNSUPPORTED_SHIPROCKET_SCENARIO: Cross-border trade type not supported in test mode")
    }
    if (context.transportMode !== "PARCEL") {
      throw new Error("UNSUPPORTED_SHIPROCKET_TRANSPORT_MODE: Transport mode not supported in test mode")
    }
    if (context.orderType !== "B2C" && context.orderType !== "B2B") {
      throw new Error("UNSUPPORTED_SHIPROCKET_SCENARIO: Only B2C and B2B supported")
    }

    // Required fields check
    if (!context.origin || !context.destination) {
      throw new Error("INVALID_SHIPMENT: Missing origin or destination")
    }
    if (!context.items || context.items.length === 0) {
      throw new Error("INVALID_SHIPMENT: Missing shipment items")
    }

    // Reuse existing packages weight calculation
    const totalWeight = context.packages?.reduce((acc: number, p: any) => acc + (p.weight || 0), 0) || 0
    if (totalWeight <= 0) {
      throw new Error("INVALID_SHIPMENT: Missing valid package weight")
    }

    const shortId = (context.shipmentId || "").slice(-8)
    const trackingNumber = `TEST-SR-${shortId}`

    return {
      trackingNumber,
      labels: [],
      metadata: {
        simulated: true,
        bookingMode: "TEST",
        transportMode: "PARCEL"
      }
    }
  }
}
