import { AbstractPalProviderAdapter } from "../abstract-provider"
import { ShipmentContext } from "../../types"
import { ProviderRate, ProviderShipmentResult } from "../provider-interface"
import { ICarrierAdapter, CarrierConnectionStatus } from "./types"
import { CARRIER_CAPABILITIES, getDerivedCapabilities } from "./capabilities"
import { organicCanadaConfig } from "./config"
import { 
  EasyshipAdapter, 
  DhlAdapter, 
  FedexAdapter, 
  UpsAdapter, 
  ShipstationAdapter 
} from "./adapters"

export class OrganicCanadaProviderService extends AbstractPalProviderAdapter {
  private subAdapters: ICarrierAdapter[] = []

  constructor(options: Record<string, any> = {}) {
    super("organic_canada", options)
    
    // Initialize underlying carrier adapters with configure connection status
    this.subAdapters = [
      new EasyshipAdapter(),
      new DhlAdapter(options),
      new FedexAdapter(),
      new UpsAdapter(),
      new ShipstationAdapter()
    ]

    // Override adapter statuses dynamically if passed through config/options
    const carrierConfigs = options.carriers || organicCanadaConfig.carriers || {}
    for (const adapter of this.subAdapters) {
      const id = adapter.getIdentifier()
      if (carrierConfigs[id]?.status) {
        (adapter as any).status = carrierConfigs[id].status
      }
    }
  }

  public getSubAdapters(): ICarrierAdapter[] {
    return this.subAdapters
  }

  public getDerivedCapabilities() {
    return getDerivedCapabilities(this.subAdapters)
  }

  public routeCarrier(context: ShipmentContext): ICarrierAdapter | null {
    // Only query CONNECTED carriers
    const active = this.subAdapters.filter(a => a.getStatus() === "CONNECTED")
    if (active.length === 0) {
      return null
    }

    const capable = active.filter(a => {
      const caps = CARRIER_CAPABILITIES[a.getIdentifier()]
      if (!caps) return false

      if (context.transportMode && !caps.transportModes.includes(context.transportMode)) {
        return false
      }
      if (context.tradeType === "DOMESTIC" && !caps.domestic) return false
      if (context.tradeType === "CROSS_BORDER" && !caps.crossBorder) return false

      return true
    })

    if (capable.length === 0) {
      return null
    }

    // Sort by preferences if provided (e.g. from vendor or admin configuration overrides)
    const preferred = context.metadata?.preferredProviders as string[] || []
    capable.sort((a, b) => {
      const idxA = preferred.indexOf(a.getIdentifier())
      const idxB = preferred.indexOf(b.getIdentifier())
      if (idxA !== -1 && idxB === -1) return -1
      if (idxA === -1 && idxB !== -1) return 1
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      return 0
    })

    return capable[0]
  }

  protected async fetchRates(context: ShipmentContext): Promise<ProviderRate[]> {
    const carrier = this.routeCarrier(context)
    if (!carrier) {
      throw new Error("NO_PROVIDER_CONNECTION")
    }
    return await carrier.getRates(context)
  }

  protected async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    const carrier = this.routeCarrier(context)
    if (!carrier) {
      throw new Error("PROVIDER_NOT_CONFIGURED")
    }
    return await carrier.bookShipment(context)
  }

  protected async voidShipment(trackingNumber: string): Promise<boolean> {
    // In our orchestration design, voiding requires carrier resolution.
    // If not possible, default to throwing NOT_CONFIGURED.
    throw new Error("PROVIDER_NOT_CONFIGURED")
  }

  protected async fetchTracking(trackingNumber: string): Promise<any> {
    // Attempt to track via each connected carrier until one succeeds, or we can look up which carrier owns it.
    // For now we assume if DHL is connected, we use it (or we could route based on tracking number format)
    const active = this.subAdapters.filter(a => a.getStatus() === "CONNECTED")
    for (const carrier of active) {
      try {
        const result = await carrier.getTracking(trackingNumber)
        if (result) return result
      } catch (err) {
        // ignore and try next
      }
    }
    throw new Error("Tracking not found or provider not configured")
  }
}
