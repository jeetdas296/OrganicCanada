import { ShipmentContext, TransportMode } from "../../types"

export class TransportModeEngine {
  public determineMode(context: ShipmentContext): ShipmentContext {
    // Basic heuristics for transport mode determination
    // In a full implementation, this would evaluate PalShippingRule from the DB
    
    let mode: TransportMode = "PARCEL"
    
    const totalWeight = context.packages.reduce((sum, pkg) => sum + (pkg.weight || 0) * pkg.quantity, 0)
    const isPalletized = context.packages.some(pkg => pkg.packageType.toLowerCase().includes("pallet"))
    
    if (context.orderType === "B2C") {
      // B2C is almost always parcel, unless it's extremely heavy (e.g. furniture)
      if (totalWeight > 150 || isPalletized) {
        mode = "LTL"
      } else {
        mode = "PARCEL"
      }
    } else if (context.orderType === "B2B") {
      if (isPalletized || totalWeight > 100) {
        if (context.tradeType === "CROSS_BORDER") {
          // Could be LTL, FTL, Air or Ocean. Defaulting to LTL for NA cross-border, or AIR/OCEAN based on destination
          // Simplified heuristic:
          if (["US", "CA", "MX"].includes(context.destination.countryCode?.toUpperCase() || "")) {
             mode = totalWeight > 5000 ? "FTL" : "LTL"
          } else {
             mode = totalWeight > 2000 ? "OCEAN_LCL" : "AIR_FREIGHT"
          }
        } else {
          // Domestic B2B
          mode = totalWeight > 5000 ? "FTL" : "LTL"
        }
      } else {
        mode = "PARCEL"
      }
    }

    return {
      ...context,
      transportMode: mode
    }
  }
}
