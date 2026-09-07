import { AbstractPalProviderAdapter } from "../abstract-provider"
import { ProviderRate, ProviderShipmentResult } from "../provider-interface"
import { ShipmentContext } from "../../types"

export class FedExFreightAdapter extends AbstractPalProviderAdapter {
  constructor(options: Record<string, any> = {}) {
    super("fedex-freight", options)
  }

  protected async fetchRates(context: ShipmentContext): Promise<ProviderRate[]> {
    return [
      {
        serviceId: "fx-freight-priority",
        serviceName: "FedEx Freight Priority",
        amount: 45000,
        currency: "USD",
      }
    ]
  }

  protected async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    const trackingNumber = "FXF" + Math.floor(Math.random() * 1000000000)
    return {
      trackingNumber,
      labels: ["https://mock-label-url.com/fxf/" + trackingNumber, "BOL_DOCUMENT_BASE64"],
      cost: 45000,
      currency: "USD"
    }
  }

  protected async voidShipment(trackingNumber: string): Promise<boolean> {
    return true
  }

  protected async fetchTracking(trackingNumber: string): Promise<any> {
    return {
      trackingNumber,
      status: "Picked up",
      events: []
    }
  }
}
