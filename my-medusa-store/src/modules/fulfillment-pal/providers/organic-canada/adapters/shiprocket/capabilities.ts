import { TransportMode } from "../../../types"

export const SHIPROCKET_CAPABILITIES = {
  transportModes: ["PARCEL"] as TransportMode[],
  domestic: true,
  crossBorder: false // To be verified manually before expanding
}
