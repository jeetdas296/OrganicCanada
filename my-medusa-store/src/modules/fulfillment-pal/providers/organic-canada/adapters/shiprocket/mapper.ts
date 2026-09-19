import { ProviderTrackingResult, ProviderTrackingEvent } from "../../../provider-interface"

export class ShiprocketStatusMapper {
  
  /**
   * Translates a Shiprocket status string to a PAL status string.
   */
  public static mapToPalStatus(shiprocketStatus: string): string {
    const statusMap: Record<string, string> = {
      "AWB ASSIGNED": "BOOKED",
      "PICKED UP": "PICKED_UP",
      "IN TRANSIT": "IN_TRANSIT",
      "OUT FOR DELIVERY": "OUT_FOR_DELIVERY",
      "DELIVERED": "DELIVERED",
      "CANCELLED": "VOIDED",
      "RTO INITIATED": "RETURN_IN_TRANSIT",
      "RTO DELIVERED": "RETURN_DELIVERED"
    }

    // Convert to upper case for normalization
    const normalized = shiprocketStatus.toUpperCase().trim()
    return statusMap[normalized] || normalized // fallback to original if unknown
  }

  /**
   * Normalizes the raw Shiprocket tracking payload into the unified ProviderTrackingResult
   */
  public static normalizeTrackingResponse(awbCode: string, payload: any): ProviderTrackingResult {
    // Determine tracking data root based on Shiprocket API structure (might be wrapped or unwrapped)
    const trackingData = payload?.tracking_data || payload || {}
    
    // Status can sometimes be in shipment_track array
    const activities = trackingData.shipment_track_activities || trackingData.shipment_track || []
    
    const events: ProviderTrackingEvent[] = activities.map((activity: any) => {
      // Shiprocket returns date like "2023-01-01 12:00:00"
      let occurredAt = new Date()
      if (activity.date) {
         // Replace space with T to make it ISO 8601 compliant if necessary
         const d = activity.date.replace(" ", "T")
         occurredAt = new Date(d)
         if (isNaN(occurredAt.getTime())) occurredAt = new Date() // fallback
      }
      
      const providerStatus = activity.activity || activity.current_status || "UNKNOWN"
      
      return {
        occurredAt,
        status: ShiprocketStatusMapper.mapToPalStatus(providerStatus),
        description: providerStatus,
        location: activity.location || undefined
      }
    })

    // Sort ascending by time (oldest to newest)
    events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())

    // Determine current status. 
    // Fall back to the last event's status if top-level track_status is missing.
    let currentStatusStr = "UNKNOWN"
    if (trackingData.current_status !== undefined) {
       currentStatusStr = trackingData.current_status
    } else if (trackingData.shipment_status !== undefined) {
       currentStatusStr = trackingData.track_status === 1 ? "DELIVERED" : trackingData.shipment_status
    } else if (events.length > 0) {
       // Since events are sorted oldest to newest, the last event is the current status
       currentStatusStr = events[events.length - 1].description || "UNKNOWN"
    }

    return {
      trackingNumber: awbCode,
      provider: "shiprocket",
      currentStatus: ShiprocketStatusMapper.mapToPalStatus(currentStatusStr),
      events,
      raw: payload
    }
  }
}
