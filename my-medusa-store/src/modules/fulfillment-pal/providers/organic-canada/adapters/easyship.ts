import { ICarrierAdapter, CarrierConnectionStatus } from "../types"
import { ShipmentContext } from "../../../types"
import { ProviderRate, ProviderShipmentResult } from "../../provider-interface"

export class EasyshipAdapter implements ICarrierAdapter {
  private status: CarrierConnectionStatus = "NOT_CONFIGURED"

  public getIdentifier(): string {
    return "easyship"
  }

  public getStatus(): CarrierConnectionStatus {
    return this.status
  }

  public async getRates(context: ShipmentContext): Promise<ProviderRate[]> {
    throw new Error("NO_PROVIDER_CONNECTION")
  }

  public async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    throw new Error("PROVIDER_NOT_CONFIGURED")
  }

  public async cancelShipment(trackingNumber: string): Promise<boolean> {
    throw new Error("PROVIDER_NOT_CONFIGURED")
  }

  public async getTracking(trackingNumber: string): Promise<any> {
    throw new Error("PROVIDER_NOT_CONFIGURED")
  }
}
