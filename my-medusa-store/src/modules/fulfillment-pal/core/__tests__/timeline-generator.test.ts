import { TimelineGenerator } from "../timeline-generator"
import { ShipmentContext } from "../../types"

describe("TimelineGenerator", () => {
  it("determines B2C_DOMESTIC correctly", () => {
    const context: ShipmentContext = {
      shipmentId: "1",
      orderId: "ord_1",
      orderType: "B2C",
      tradeType: "DOMESTIC",
      tradeDirection: "DOMESTIC",
      origin: { countryCode: "CA", city: "Toronto" },
      destination: { countryCode: "CA", city: "Vancouver" },
      items: [],
      packages: []
    }
    const scenario = TimelineGenerator.determineScenario(context)
    expect(scenario).toBe("B2C_DOMESTIC")
    
    const steps = TimelineGenerator.getStepsForScenario(scenario)
    expect(steps.length).toBe(10)
    expect(steps[0].code).toBe("ORDER_CONFIRMED")
    expect(steps[9].code).toBe("DELIVERED")
    expect(steps.some(s => s.code === "CUSTOMS_PREPARATION")).toBe(false)
  })

  it("determines B2C_CROSS_BORDER correctly", () => {
    const context: ShipmentContext = {
      shipmentId: "1",
      orderId: "ord_1",
      orderType: "B2C",
      tradeType: "CROSS_BORDER",
      tradeDirection: "EXPORT",
      origin: { countryCode: "CA", city: "Toronto" },
      destination: { countryCode: "US", city: "New York" },
      items: [],
      packages: []
    }
    const scenario = TimelineGenerator.determineScenario(context)
    expect(scenario).toBe("B2C_CROSS_BORDER")
    
    const steps = TimelineGenerator.getStepsForScenario(scenario)
    expect(steps.length).toBe(11)
    expect(steps.some(s => s.code === "CUSTOMS_PREPARATION")).toBe(true)
    expect(steps.some(s => s.code === "EXPORT_DOCUMENTATION")).toBe(true)
  })

  it("determines B2B_DOMESTIC correctly", () => {
    const context: ShipmentContext = {
      shipmentId: "1",
      orderId: "ord_1",
      orderType: "B2B",
      tradeType: "DOMESTIC",
      tradeDirection: "DOMESTIC",
      origin: { countryCode: "CA", city: "Toronto" },
      destination: { countryCode: "CA", city: "Vancouver" },
      items: [],
      packages: []
    }
    const scenario = TimelineGenerator.determineScenario(context)
    expect(scenario).toBe("B2B_DOMESTIC")
    
    const steps = TimelineGenerator.getStepsForScenario(scenario)
    expect(steps.length).toBe(10)
    expect(steps.some(s => s.code === "FREIGHT_PLANNING")).toBe(true)
    expect(steps.some(s => s.code === "COMMERCIAL_INVOICE")).toBe(false)
  })

  it("determines B2B_CROSS_BORDER correctly", () => {
    const context: ShipmentContext = {
      shipmentId: "1",
      orderId: "ord_1",
      orderType: "B2B",
      tradeType: "CROSS_BORDER",
      tradeDirection: "EXPORT",
      origin: { countryCode: "CA", city: "Toronto" },
      destination: { countryCode: "US", city: "New York" },
      items: [],
      packages: []
    }
    const scenario = TimelineGenerator.determineScenario(context)
    expect(scenario).toBe("B2B_CROSS_BORDER")
    
    const steps = TimelineGenerator.getStepsForScenario(scenario)
    expect(steps.length).toBe(13)
    expect(steps.some(s => s.code === "COMMERCIAL_INVOICE")).toBe(true)
    expect(steps.some(s => s.code === "IMPORT_CUSTOMS")).toBe(true)
    expect(steps.some(s => s.code === "CERTIFICATE_OF_ORIGIN")).toBe(true)
  })
})
