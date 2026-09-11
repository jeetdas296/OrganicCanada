import { ShipmentContext } from "../../types"
import { ProviderRate, ProviderShipmentResult } from "../provider-interface"

export type CarrierConnectionStatus = "NOT_CONFIGURED" | "CONNECTED" | "DISABLED" | "ERROR"

export interface CarrierConfig {
  status: CarrierConnectionStatus
  priority?: number
  options?: Record<string, any>
}

export interface ICarrierAdapter {
  getIdentifier(): string
  getStatus(): CarrierConnectionStatus
  getRates(context: ShipmentContext): Promise<ProviderRate[]>
  bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult>
  cancelShipment(trackingNumber: string, metadata?: Record<string, unknown>): Promise<boolean>
  getTracking(trackingNumber: string): Promise<any>
  testConnection?(): Promise<{ status: CarrierConnectionStatus, error?: string }>
}
