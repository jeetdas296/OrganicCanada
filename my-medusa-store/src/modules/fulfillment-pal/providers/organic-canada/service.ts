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
  ShipstationAdapter,
  ShiprocketAdapter
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
      new ShipstationAdapter(),
      new ShiprocketAdapter(options)
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
    // If no carrier was explicitly selected by the user/system via metadata,
    // defer booking until the UI triggers it.
    const preferred = context.metadata?.preferredProviders as string[] || []
    if (preferred.length === 0) {
      throw new Error("PROVIDER_NOT_CONFIGURED")
    }

    const carrier = this.routeCarrier(context)
    if (!carrier) {
      throw new Error("PROVIDER_NOT_CONFIGURED")
    }
    
    try {
      const result = await carrier.bookShipment(context)
      result.metadata = {
        ...(result.metadata || {}),
        carrier_id: carrier.getIdentifier()
      }
      return result
    } catch (err: any) {
      if (err.metadata) {
        err.metadata.carrier_id = carrier.getIdentifier()
      }
      throw err
    }
  }

  protected async voidShipment(trackingNumber: string): Promise<boolean> {
    try {
      // 1. Resolve global PAL service instance
      const { default: FulfillmentPalModuleService } = await import("./../../service")
      const palService = FulfillmentPalModuleService.instance
      
      if (!palService) {
        console.warn("[PAL] Cannot void shipment: no palService instance available")
        return false
      }
      
      // 2. Look up booking by external_booking_id
      const bookings = await (palService as any).listPalProviderBookings({
        external_booking_id: trackingNumber
      })
      
      if (!bookings || bookings.length === 0) {
        console.warn(`[PAL] No booking found for trackingNumber ${trackingNumber}`)
        return false
      }
      
      const booking = bookings[0]
      const metadata = booking.response_payload?.metadata
      const carrierId = metadata?.carrier_id
      
      if (!carrierId) {
        console.warn(`[PAL] No carrier_id recorded in booking metadata for ${trackingNumber}`)
        return false
      }
      
      // 3. Delegate cancellation to the EXACT adapter that created it
      const carrier = this.subAdapters.find(a => a.getIdentifier() === carrierId)
      if (!carrier) {
        console.warn(`[PAL] Carrier ${carrierId} not found in connected adapters`)
        return false
      }
      
      if (carrier.getStatus() !== "CONNECTED") {
        console.warn(`[PAL] Carrier ${carrierId} is disconnected. Cannot cancel shipment.`)
        return false
      }
      
      try {
        const success = await carrier.cancelShipment(trackingNumber, metadata)
        if (success) {
          // Update booking status to VOIDED on success
          await (palService as any).updatePalProviderBookings({
            id: booking.id,
            status: "VOIDED"
          })
          return true
        }
      } catch (err) {
        console.error(`[PAL] Error cancelling shipment via ${carrierId}:`, err)
      }
      
      return false
    } catch (e: any) {
      console.error("[PAL] Error in voidShipment:", e)
      return false
    }
  }

  protected async fetchTracking(trackingNumber: string): Promise<any> {
    try {
      // 1. Resolve FulfillmentPalModuleService
      const { FULFILLMENT_PAL_MODULE } = await import("../../index")
      const { Medusa } = await import("@medusajs/framework/utils")
      
      let palService: any
      try {
        const { FulfillmentPalModuleService } = await import("../../services/pal-fulfillment-provider")
        palService = (FulfillmentPalModuleService as any).instance
      } catch (e) {
        console.warn("[PAL] Could not resolve static instance, tracking may fail")
      }

      if (!palService) {
        throw new Error("Could not resolve FulfillmentPalModuleService")
      }

      // 2. Look up the booking by tracking number (external_booking_id)
      const bookings = await (palService as any).listPalProviderBookings({
        external_booking_id: trackingNumber
      })

      if (!bookings || bookings.length === 0) {
        throw new Error(`[PAL] No booking found for tracking number ${trackingNumber}`)
      }

      const booking = bookings[0]
      const metadata = booking.response_payload?.metadata || {}
      const carrierId = metadata.carrier_id

      if (!carrierId) {
        throw new Error(`[PAL] Booking found but no carrier_id in metadata for tracking ${trackingNumber}`)
      }

      // 3. Find exact adapter and call getTracking
      const carrier = this.subAdapters.find(a => a.getIdentifier() === carrierId)
      if (!carrier) {
        throw new Error(`[PAL] Carrier ${carrierId} not found in connected adapters`)
      }
      
      if (carrier.getStatus() !== "CONNECTED") {
        throw new Error(`[PAL] Carrier ${carrierId} is disconnected.`)
      }
      
      return await carrier.getTracking(trackingNumber, metadata)
    } catch (e: any) {
      console.error("[PAL] Error in fetchTracking:", e)
      throw new Error(`Tracking not found or provider not configured: ${e.message}`)
    }
  }
}
