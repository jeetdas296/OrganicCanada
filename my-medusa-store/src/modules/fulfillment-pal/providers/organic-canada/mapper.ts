import { ProviderRate, ProviderShipmentResult } from "../provider-interface"

export class OrganicCanadaMapper {
  public static mapStatus(carrierStatus: string): string {
    const statusMap: Record<string, string> = {
      // Standard carrier states
      "picked_up": "PICKED_UP",
      "pickedup": "PICKED_UP",
      "in_transit": "IN_TRANSIT",
      "intransit": "IN_TRANSIT",
      "out_for_delivery": "OUT_FOR_DELIVERY",
      "delivered": "DELIVERED",
      "exception": "EXCEPTION",
      "failed": "EXCEPTION",
      "cancelled": "CANCELLED",
      "voided": "CANCELLED"
    }

    const normalized = carrierStatus.toLowerCase().replace(/[\s_-]+/g, "")
    return statusMap[normalized] || "IN_TRANSIT"
  }

  public static normalizeBooking(result: any): ProviderShipmentResult {
    return {
      trackingNumber: result.trackingNumber || result.tracking_number,
      labels: result.labels || result.label_urls || [],
      cost: result.cost || result.amount,
      currency: result.currency || "USD",
      metadata: result.metadata || {}
    }
  }

  public static normalizeRates(rates: any[]): ProviderRate[] {
    return rates.map(rate => ({
      serviceId: rate.serviceId || rate.service_id,
      serviceName: rate.serviceName || rate.service_name,
      amount: rate.amount || rate.price,
      currency: rate.currency || "USD",
      estimatedDeliveryDate: rate.estimatedDeliveryDate ? new Date(rate.estimatedDeliveryDate) : undefined
    }))
  }
}
