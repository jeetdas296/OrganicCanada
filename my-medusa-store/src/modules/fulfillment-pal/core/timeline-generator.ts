import { ShipmentContext } from "../types"

export type Scenario = "B2C_DOMESTIC" | "B2C_CROSS_BORDER" | "B2B_DOMESTIC" | "B2B_CROSS_BORDER"

export interface TimelineStepDefinition {
  code: string
  name: string
  order: number
}

const B2C_DOMESTIC_STEPS: TimelineStepDefinition[] = [
  { code: "ORDER_CONFIRMED", name: "Order Confirmed", order: 1 },
  { code: "PAYMENT_CONFIRMED", name: "Payment Confirmed", order: 2 },
  { code: "INVENTORY_CONFIRMED", name: "Inventory Confirmed", order: 3 },
  { code: "PICKING", name: "Picking", order: 4 },
  { code: "PACKING", name: "Packing", order: 5 },
  { code: "SHIPMENT_READY", name: "Shipment Ready", order: 6 },
  { code: "SHIPPED", name: "Shipped", order: 7 },
  { code: "IN_TRANSIT", name: "In Transit", order: 8 },
  { code: "OUT_FOR_DELIVERY", name: "Out for Delivery", order: 9 },
  { code: "DELIVERED", name: "Delivered", order: 10 }
]

const B2C_CROSS_BORDER_STEPS: TimelineStepDefinition[] = [
  { code: "ORDER_CONFIRMED", name: "Order Confirmed", order: 1 },
  { code: "PAYMENT_CONFIRMED", name: "Payment Confirmed", order: 2 },
  { code: "INVENTORY_CONFIRMED", name: "Inventory Confirmed", order: 3 },
  { code: "EXPORT_DOCUMENTATION", name: "Export Documentation", order: 4 },
  { code: "CUSTOMS_PREPARATION", name: "Customs Preparation", order: 5 },
  { code: "CARRIER_BOOKING", name: "Carrier Booking", order: 6 },
  { code: "EXPORT_CUSTOMS", name: "Export Customs", order: 7 },
  { code: "IN_TRANSIT", name: "In Transit", order: 8 },
  { code: "IMPORT_CUSTOMS", name: "Import Customs", order: 9 },
  { code: "OUT_FOR_DELIVERY", name: "Out for Delivery", order: 10 },
  { code: "DELIVERED", name: "Delivered", order: 11 }
]

const B2B_DOMESTIC_STEPS: TimelineStepDefinition[] = [
  { code: "ORDER_CONFIRMED", name: "Order Confirmed", order: 1 },
  { code: "PAYMENT_TERMS_CONFIRMED", name: "Payment Terms Confirmed", order: 2 },
  { code: "INVENTORY_ALLOCATION", name: "Inventory Allocation", order: 3 },
  { code: "PICKING", name: "Picking", order: 4 },
  { code: "PACKING", name: "Packing", order: 5 },
  { code: "FREIGHT_PLANNING", name: "Freight Planning", order: 6 },
  { code: "PICKUP_SCHEDULED", name: "Pickup Scheduled", order: 7 },
  { code: "PICKED_UP", name: "Picked Up", order: 8 },
  { code: "IN_TRANSIT", name: "In Transit", order: 9 },
  { code: "DELIVERED", name: "Delivered", order: 10 }
]

const B2B_CROSS_BORDER_STEPS: TimelineStepDefinition[] = [
  { code: "ORDER_CONFIRMED", name: "Order Confirmed", order: 1 },
  { code: "PAYMENT_TERMS_CONFIRMED", name: "Payment Terms Confirmed", order: 2 },
  { code: "INVENTORY_ALLOCATION", name: "Inventory Allocation", order: 3 },
  { code: "EXPORT_DOCUMENTATION", name: "Export Documentation", order: 4 },
  { code: "CUSTOMS_PREPARATION", name: "Customs Preparation", order: 5 },
  { code: "COMMERCIAL_INVOICE", name: "Commercial Invoice", order: 6 },
  { code: "PACKING_LIST", name: "Packing List", order: 7 },
  { code: "CERTIFICATE_OF_ORIGIN", name: "Certificate of Origin", order: 8 },
  { code: "EXPORT_CUSTOMS", name: "Export Customs", order: 9 },
  { code: "IN_TRANSIT", name: "In Transit", order: 10 },
  { code: "IMPORT_CUSTOMS", name: "Import Customs", order: 11 },
  { code: "OUT_FOR_DELIVERY", name: "Out for Delivery", order: 12 },
  { code: "DELIVERED", name: "Delivered", order: 13 }
]

export class TimelineGenerator {
  static determineScenario(context: ShipmentContext): Scenario {
    const isB2B = context.orderType === "B2B"
    const isCrossBorder = context.tradeType === "CROSS_BORDER"
    
    if (isB2B) {
      return isCrossBorder ? "B2B_CROSS_BORDER" : "B2B_DOMESTIC"
    } else {
      return isCrossBorder ? "B2C_CROSS_BORDER" : "B2C_DOMESTIC"
    }
  }

  static getStepsForScenario(scenario: Scenario): TimelineStepDefinition[] {
    switch (scenario) {
      case "B2C_DOMESTIC": return B2C_DOMESTIC_STEPS
      case "B2C_CROSS_BORDER": return B2C_CROSS_BORDER_STEPS
      case "B2B_DOMESTIC": return B2B_DOMESTIC_STEPS
      case "B2B_CROSS_BORDER": return B2B_CROSS_BORDER_STEPS
    }
  }
}
