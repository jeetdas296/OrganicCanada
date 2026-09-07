import { ShipmentContext } from "../types"
import { IPalProviderAdapter, ProviderRate, ProviderShipmentResult } from "./provider-interface"

export abstract class AbstractPalProviderAdapter implements IPalProviderAdapter {
  protected identifier: string
  protected apiKey: string

  constructor(identifier: string, options: Record<string, any> = {}) {
    this.identifier = identifier
    this.apiKey = options.apiKey || ""
  }

  public getIdentifier(): string {
    return this.identifier
  }

  public async getRates(context: ShipmentContext): Promise<ProviderRate[]> {
    try {
      return await this.fetchRates(context)
    } catch (error: any) {
      this.handleError("getRates", error)
      return []
    }
  }

  public async createShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    try {
      return await this.bookShipment(context)
    } catch (error: any) {
      this.handleError("createShipment", error)
      throw error
    }
  }

  public async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      return await this.voidShipment(trackingNumber)
    } catch (error: any) {
      this.handleError("cancelShipment", error)
      return false
    }
  }

  public async getTracking(trackingNumber: string): Promise<any> {
    try {
      return await this.fetchTracking(trackingNumber)
    } catch (error: any) {
      this.handleError("getTracking", error)
      return null
    }
  }

  // Abstract methods to be implemented by specific provider adapters
  protected abstract fetchRates(context: ShipmentContext): Promise<ProviderRate[]>
  protected abstract bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult>
  protected abstract voidShipment(trackingNumber: string): Promise<boolean>
  protected abstract fetchTracking(trackingNumber: string): Promise<any>

  protected handleError(operation: string, error: any): void {
    // Standardize error logging or metrics reporting
    console.error(`[${this.identifier}] Error during ${operation}:`, error?.message || error)
  }
}
