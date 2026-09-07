import FulfillmentPalModuleService from "../../service"

describe("PAL Module Service Timeline Regression", () => {
  it("should have timeline methods registered on the module service prototype", () => {
    // The methods are generated dynamically and attached to the prototype by MedusaService
    const prototype = Object.getPrototypeOf(FulfillmentPalModuleService)
    
    // Instantiate it with a mock container so we can verify properties if they are attached to instance
    // Or just check the prototype methods.
    // In Medusa v2, the models passed to MedusaService create mixins with the generated methods.
    const instance = new FulfillmentPalModuleService({} as any)
    
    expect(typeof (instance as any).listPalShipmentTimelines).toBe("function")
    expect(typeof (instance as any).createPalShipmentTimelines).toBe("function")
    expect(typeof (instance as any).updatePalShipmentTimelines).toBe("function")
    
    expect(typeof (instance as any).listPalShipmentTimelineSteps).toBe("function")
    expect(typeof (instance as any).createPalShipmentTimelineSteps).toBe("function")
  })
})
