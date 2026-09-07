import { TimelineGenerator } from "../timeline-generator"
import { ShipmentContext } from "../../types"

describe("B2B/B2C Classification and Scenario Routing", () => {
  // Pure function simulating the logic now implemented in order-management.ts
  const getOrderType = (metadata: any) => {
    const b2bStatus = metadata?.b2b_status
    if (b2bStatus === "approved") {
      return "B2B"
    }
    return "B2C"
  }

  describe("Customer Metadata Evaluation", () => {
    it("should classify as B2B when b2b_status is strictly 'approved'", () => {
      expect(getOrderType({ b2b_status: "approved" })).toBe("B2B")
    })

    it("should classify as B2B even with extra metadata", () => {
      expect(getOrderType({ b2b_status: "approved", business_type: "Grocery" })).toBe("B2B")
    })

    it("should classify as B2C for null metadata", () => {
      expect(getOrderType(null)).toBe("B2C")
    })

    it("should classify as B2C for missing b2b_status", () => {
      expect(getOrderType({})).toBe("B2C")
    })

    it("should classify as B2C for 'pending' status", () => {
      expect(getOrderType({ b2b_status: "pending" })).toBe("B2C")
    })

    it("should classify as B2C for 'rejected' status", () => {
      expect(getOrderType({ b2b_status: "rejected" })).toBe("B2C")
    })
    
    it("should classify as B2C for truthy but incorrect string", () => {
      expect(getOrderType({ b2b_status: "Approved" })).toBe("B2C") // Case sensitive!
      expect(getOrderType({ b2b_status: " approved " })).toBe("B2C") // Strict comparison!
    })
  })

  describe("Scenario Matrix Evaluation", () => {
    const baseContext = {
      shipmentId: "shp_1",
      orderId: "ord_1",
      fulfillmentId: "ful_1",
      items: [],
      packages: []
    }

    it("CASE 1: B2C DOMESTIC (metadata=null, DK -> DK)", () => {
      const orderType = getOrderType(null)
      const context: ShipmentContext = {
        ...baseContext,
        orderType,
        tradeType: "DOMESTIC",
        origin: { countryCode: "DK", city: "Copenhagen" },
        destination: { countryCode: "DK", city: "Aarhus" }
      }
      expect(orderType).toBe("B2C")
      expect(TimelineGenerator.determineScenario(context)).toBe("B2C_DOMESTIC")
    })

    it("CASE 2: B2C CROSS-BORDER (metadata=null, DK -> CA)", () => {
      const orderType = getOrderType(null)
      const context: ShipmentContext = {
        ...baseContext,
        orderType,
        tradeType: "CROSS_BORDER",
        origin: { countryCode: "DK", city: "Copenhagen" },
        destination: { countryCode: "CA", city: "Toronto" }
      }
      expect(orderType).toBe("B2C")
      expect(TimelineGenerator.determineScenario(context)).toBe("B2C_CROSS_BORDER")
    })

    it("CASE 3: B2B DOMESTIC (metadata.b2b_status='approved', DK -> DK)", () => {
      const orderType = getOrderType({ b2b_status: "approved" })
      const context: ShipmentContext = {
        ...baseContext,
        orderType,
        tradeType: "DOMESTIC",
        origin: { countryCode: "DK", city: "Copenhagen" },
        destination: { countryCode: "DK", city: "Aarhus" }
      }
      expect(orderType).toBe("B2B")
      expect(TimelineGenerator.determineScenario(context)).toBe("B2B_DOMESTIC")
    })

    it("CASE 4: B2B CROSS-BORDER (metadata.b2b_status='approved', DK -> CA)", () => {
      const orderType = getOrderType({ b2b_status: "approved" })
      const context: ShipmentContext = {
        ...baseContext,
        orderType,
        tradeType: "CROSS_BORDER",
        origin: { countryCode: "DK", city: "Copenhagen" },
        destination: { countryCode: "CA", city: "Toronto" }
      }
      expect(orderType).toBe("B2B")
      expect(TimelineGenerator.determineScenario(context)).toBe("B2B_CROSS_BORDER")
    })
  })
})
