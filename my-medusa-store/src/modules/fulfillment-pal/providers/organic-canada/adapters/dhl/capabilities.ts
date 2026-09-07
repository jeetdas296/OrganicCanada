import { ProviderCapability } from "../../../../core/provider-registry"

export const DhlCapabilities: ProviderCapability = {
  transportModes: ["PARCEL"], // strictly parcel
  domestic: true,
  crossBorder: true,
  rating: true,
  booking: true,
  tracking: true,
  label: true,
  customs: true
}
