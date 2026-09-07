import { AbstractPalProviderAdapter } from "../abstract-provider"
import { ProviderRate, ProviderShipmentResult } from "../provider-interface"
import { ShipmentContext } from "../../types"

export class CanadaPostAdapter extends AbstractPalProviderAdapter {
  constructor(options: Record<string, any> = {}) {
    super("canada-post", options)
  }

  protected async fetchRates(context: ShipmentContext): Promise<ProviderRate[]> {
    return [
      {
        serviceId: "cp-regular",
        serviceName: "Regular Parcel",
        amount: 1250,
        currency: "CAD",
      },
      {
        serviceId: "cp-xpress",
        serviceName: "Xpresspost",
        amount: 2500,
        currency: "CAD",
      }
    ]
  }

  protected async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    const trackingNumber = "CP" + Math.floor(Math.random() * 1000000000) + "CA"
    return {
      trackingNumber,
      labels: ["https://mock-label-url.com/cp/" + trackingNumber],
      cost: 1250,
      currency: "CAD"
    }
  }

  protected async voidShipment(trackingNumber: string): Promise<boolean> {
    return true
  }

  protected async fetchTracking(trackingNumber: string): Promise<any> {
    return {
      trackingNumber,
      status: "In Transit",
      events: []
    }
  }
}
