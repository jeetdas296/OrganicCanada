import { ShipmentContext } from "../types"

export interface ProviderRate {
  serviceId: string
  serviceName: string
  amount: number
  currency: string
  estimatedDeliveryDate?: Date
}

export interface ProviderShipmentResult {
  trackingNumber: string
  labels: string[] // URLs or base64
  cost?: number
  currency?: string
  metadata?: Record<string, unknown>
}

export interface ProviderTrackingEvent {
  occurredAt: Date
  status: string
  description?: string
  location?: string
}

export interface ProviderTrackingResult {
  trackingNumber: string
  provider: string
  currentStatus: string
  events: ProviderTrackingEvent[]
  raw?: Record<string, unknown>
}

export interface IPalProviderAdapter {
  getIdentifier(): string
  
  getRates(context: ShipmentContext): Promise<ProviderRate[]>
  
  createShipment(context: ShipmentContext): Promise<ProviderShipmentResult>
  
  cancelShipment(trackingNumber: string): Promise<boolean>
  
  getTracking(trackingNumber: string, metadata?: Record<string, unknown>): Promise<ProviderTrackingResult | any>
}
