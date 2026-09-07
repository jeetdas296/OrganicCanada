import { AbstractPalProviderAdapter } from "../abstract-provider"
import { ProviderRate, ProviderShipmentResult } from "../provider-interface"
import { ShipmentContext } from "../../types"

export class FlexportAdapter extends AbstractPalProviderAdapter {
  constructor(options: Record<string, any> = {}) {
    super("flexport", options)
  }

  protected async fetchRates(context: ShipmentContext): Promise<ProviderRate[]> {
    return [
      {
        serviceId: "flexport-ocean-lcl",
        serviceName: "Ocean LCL",
        amount: 85000,
        currency: "USD",
      },
      {
        serviceId: "flexport-air",
        serviceName: "Air Freight",
        amount: 220000,
        currency: "USD",
      }
    ]
  }

  protected async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    const trackingNumber = "FLXP" + Math.floor(Math.random() * 1000000000)
    return {
      trackingNumber,
      labels: ["BILL_OF_LADING_DOC", "CUSTOMS_DEC_DOC"],
      cost: context.transportMode === "AIR_FREIGHT" ? 220000 : 85000,
      currency: "USD"
    }
  }

  protected async voidShipment(trackingNumber: string): Promise<boolean> {
    return true
  }

  protected async fetchTracking(trackingNumber: string): Promise<any> {
    return {
      trackingNumber,
      status: "Customs Clearance",
      events: []
    }
  }
}
