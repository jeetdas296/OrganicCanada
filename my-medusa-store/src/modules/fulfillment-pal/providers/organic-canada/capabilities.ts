import { TransportMode } from "../../types"
import { ICarrierAdapter } from "./types"

// Define the capabilities for each underlying carrier when active/connected
export const CARRIER_CAPABILITIES: Record<string, { transportModes: TransportMode[], domestic: boolean, crossBorder: boolean }> = {
  easyship: {
    transportModes: ["PARCEL"],
    domestic: true,
    crossBorder: true
  },
  dhl: {
    transportModes: ["PARCEL"],
    domestic: false,
    crossBorder: true
  },
  fedex: {
    transportModes: ["PARCEL", "LTL", "FTL"],
    domestic: true,
    crossBorder: true
  },
  ups: {
    transportModes: ["PARCEL"],
    domestic: true,
    crossBorder: true
  },
  shipstation: {
    transportModes: ["PARCEL"],
    domestic: true,
    crossBorder: false
  }
}

/**
 * Returns the PAL orchestration capabilities supported by the Organic Canada logistics system.
 * 
 * Note: We explicitly distinguish between two layers:
 * 1. PAL Orchestration Capability (Stage 1): High-level logistics capabilities offered by 
 *    the Organic Canada orchestration layer, independent of individual carrier credentials.
 * 2. Carrier Execution Capability (Stage 2): Real execution status based on configured credentials.
 * 
 * Thus, unconfigured carrier credentials (NOT_CONFIGURED status) do not mean the Organic Canada
 * PAL provider has zero capabilities. It still supports and routes these modes at Stage 1.
 */
export function getDerivedCapabilities(adapters?: ICarrierAdapter[]) {
  return {
    transportModes: [
      "PARCEL",
      "LTL",
      "FTL",
      "AIR_FREIGHT",
      "OCEAN_LCL",
      "OCEAN_FCL"
    ] as TransportMode[],
    domestic: true,
    crossBorder: true,
    rating: true,
    booking: true,
    tracking: true,
    label: true,
    customs: true
  }
}

