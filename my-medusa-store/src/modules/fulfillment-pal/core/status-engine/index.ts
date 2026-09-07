export type ShipmentStatus = 
  | "CREATED"
  | "ACCEPTED"
  | "PICKING"
  | "PACKED"
  | "READY_TO_SHIP"
  | "BOOKING"
  | "BOOKED"
  | "LABEL_CREATED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "CUSTOMS_CLEARANCE"
  | "CUSTOMS_CLEARED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "BOOKING_FAILED"
  | "CUSTOMS_HOLD"
  | "DELIVERY_FAILED"
  | "CANCELLED"
  | "RETURNED"
  | "LOST"
  | "DAMAGED"

export class StatusEngine {
  // Define valid transitions from each state
  private validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    "CREATED": ["ACCEPTED", "CANCELLED"],
    "ACCEPTED": ["PICKING", "PACKED", "READY_TO_SHIP", "CANCELLED"],
    "PICKING": ["PACKED", "CANCELLED"],
    "PACKED": ["READY_TO_SHIP", "CANCELLED"],
    "READY_TO_SHIP": ["BOOKING", "CANCELLED"],
    "BOOKING": ["BOOKED", "BOOKING_FAILED", "CANCELLED"],
    "BOOKING_FAILED": ["BOOKING", "CANCELLED"], // can retry
    "BOOKED": ["LABEL_CREATED", "PICKUP_SCHEDULED", "PICKED_UP", "CANCELLED"],
    "LABEL_CREATED": ["PICKUP_SCHEDULED", "PICKED_UP", "CANCELLED"],
    "PICKUP_SCHEDULED": ["PICKED_UP", "CANCELLED"],
    "PICKED_UP": ["IN_TRANSIT", "CANCELLED"],
    "IN_TRANSIT": ["CUSTOMS_CLEARANCE", "OUT_FOR_DELIVERY", "DELIVERED", "CUSTOMS_HOLD", "LOST", "DAMAGED"],
    "CUSTOMS_CLEARANCE": ["CUSTOMS_CLEARED", "CUSTOMS_HOLD", "RETURNED"],
    "CUSTOMS_HOLD": ["CUSTOMS_CLEARED", "CUSTOMS_CLEARANCE", "RETURNED", "CANCELLED"],
    "CUSTOMS_CLEARED": ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "DELIVERY_FAILED"],
    "DELIVERY_FAILED": ["OUT_FOR_DELIVERY", "RETURNED", "LOST"], // retry delivery
    "DELIVERED": ["RETURNED"],
    "CANCELLED": [], // terminal state (usually)
    "RETURNED": [], // terminal state
    "LOST": [], // terminal state
    "DAMAGED": ["RETURNED"]
  }

  public canTransition(currentStatus: ShipmentStatus, nextStatus: ShipmentStatus): boolean {
    if (currentStatus === nextStatus) return true
    
    const allowed = this.validTransitions[currentStatus]
    return allowed?.includes(nextStatus) ?? false
  }

  public validateTransition(currentStatus: ShipmentStatus, nextStatus: ShipmentStatus): void {
    if (!this.canTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`)
    }
  }
}
