import { ShipmentContext } from "../../types"
import { ProviderRegistration, ProviderRegistry } from "../provider-registry"

export interface RouterOptions {
  requireRating?: boolean
  requireBooking?: boolean
  requireTracking?: boolean
  requireLabel?: boolean
  requireCustoms?: boolean
  preferredProviders?: string[]
}

export class ProviderRouter {
  private registry: ProviderRegistry

  constructor(registry: ProviderRegistry) {
    this.registry = registry
  }

  public route(context: ShipmentContext, options: RouterOptions = {}): ProviderRegistration | undefined {
    if (!context.transportMode) {
      throw new Error("Cannot route provider without a determined transport mode")
    }

    if (!context.tradeType) {
      throw new Error("Cannot route provider without a determined trade type")
    }

    const allProviders = this.registry.getAllProviders()

    // 1. Filter out unsupported capabilities
    const capableProviders = allProviders.filter(provider => {
      const caps = provider.capabilities
      
      // Transport mode check
      if (!caps.transportModes.includes(context.transportMode!)) {
        return false
      }

      // Trade type check
      if (context.tradeType === "DOMESTIC" && !caps.domestic) return false
      if (context.tradeType === "CROSS_BORDER" && !caps.crossBorder) return false

      // Requested functional capabilities
      if (options.requireRating && !caps.rating) return false
      if (options.requireBooking && !caps.booking) return false
      if (options.requireTracking && !caps.tracking) return false
      if (options.requireLabel && !caps.label) return false
      if (options.requireCustoms && !caps.customs) return false

      return true
    })

    if (capableProviders.length === 0) {
      return undefined // No providers can handle this shipment
    }

    // 2. Rank providers
    // Sort by preferred array first (if present), then by inherent priority
    capableProviders.sort((a, b) => {
      // Check preferences
      if (options.preferredProviders && options.preferredProviders.length > 0) {
        const indexA = options.preferredProviders.indexOf(a.id)
        const indexB = options.preferredProviders.indexOf(b.id)
        
        const isPrefA = indexA !== -1
        const isPrefB = indexB !== -1
        
        if (isPrefA && !isPrefB) return -1
        if (!isPrefA && isPrefB) return 1
        if (isPrefA && isPrefB) return indexA - indexB // higher preference first
      }
      
      // Fallback to provider default priority
      return a.priority - b.priority
    })

    // 3. Return top choice
    return capableProviders[0]
  }
}
