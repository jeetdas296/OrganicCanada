import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createContainer, asValue } from "awilix"
import { createPalShipmentStep } from "../../workflows/steps/create-pal-shipment"
import { classifyTradeStep } from "../../workflows/steps/classify-trade"
import { FULFILLMENT_PAL_MODULE } from "../../index"

describe("Dynamic Fulfillment Origin & Destination Resolution", () => {
  let mockPalService: any

  beforeEach(() => {
    mockPalService = {
      listPalShipments: jest.fn().mockResolvedValue([]),
      createPalShipments: jest.fn().mockImplementation((data) => Promise.resolve({ id: "ship_test_123", ...data })),
      createPalShipmentAddresses: jest.fn().mockImplementation((data) => Promise.resolve({ id: `addr_${data.type}`, ...data })),
      updatePalShipments: jest.fn().mockResolvedValue({}),
      createPalPackages: jest.fn().mockImplementation((data) => Promise.resolve({ id: "pkg_1", ...data })),
      createPalShipmentStatusHistories: jest.fn().mockResolvedValue({})
    }
  })

  function createTestContainer() {
    const container = createContainer()
    container.register({
      [FULFILLMENT_PAL_MODULE]: asValue(mockPalService)
    })
    return container
  }

  const testWorkflow = createWorkflow("test-dynamic-origin-workflow", (input: any) => {
    const step1 = createPalShipmentStep(input)
    const step2 = classifyTradeStep(step1)
    return new WorkflowResponse(step2)
  })

  it("Test 1: Fulfillment location = DK, Order shipping country = DK => DOMESTIC", async () => {
    const container = createTestContainer()
    const { result } = (await testWorkflow(container as any).run({
      input: { 
        orderId: "ord_dk", 
        fulfillmentId: "ful_dk", 
        items: [], 
        packages: [],
        originStockLocationAddress: { country_code: "DK", city: "Test City", address_1: "Test St 1", postal_code: "12345" },
        destinationShippingAddress: { country_code: "DK", city: "Dest City", address_1: "Dest St 2", postal_code: "67890" },
        orderType: "B2C"
      }
    })) as any

    expect(result.origin.countryCode).toBe("DK")
    expect(result.destination.countryCode).toBe("DK")
    expect(result.tradeType).toBe("DOMESTIC")
  })

  it("Test 2: Fulfillment location = CA, Order shipping country = CA => DOMESTIC", async () => {
    const container = createTestContainer()
    const { result } = (await testWorkflow(container as any).run({
      input: { 
        orderId: "ord_ca", 
        fulfillmentId: "ful_ca", 
        items: [], 
        packages: [],
        originStockLocationAddress: { country_code: "CA", city: "Test City", address_1: "Test St 1", postal_code: "12345" },
        destinationShippingAddress: { country_code: "CA", city: "Dest City", address_1: "Dest St 2", postal_code: "67890" },
        orderType: "B2C"
      }
    })) as any

    expect(result.origin.countryCode).toBe("CA")
    expect(result.destination.countryCode).toBe("CA")
    expect(result.tradeType).toBe("DOMESTIC")
  })

  it("Test 3: Fulfillment location = DK, Order shipping country = CA => CROSS_BORDER", async () => {
    const container = createTestContainer()
    const { result } = (await testWorkflow(container as any).run({
      input: { 
        orderId: "ord_ca", 
        fulfillmentId: "ful_dk", 
        items: [], 
        packages: [],
        originStockLocationAddress: { country_code: "DK", city: "Test City", address_1: "Test St 1", postal_code: "12345" },
        destinationShippingAddress: { country_code: "CA", city: "Dest City", address_1: "Dest St 2", postal_code: "67890" },
        orderType: "B2C"
      }
    })) as any

    expect(result.origin.countryCode).toBe("DK")
    expect(result.destination.countryCode).toBe("CA")
    expect(result.tradeType).toBe("CROSS_BORDER")
  })

  it("Test 4: Fulfillment location = CA, Order shipping country = DK => CROSS_BORDER", async () => {
    const container = createTestContainer()
    const { result } = (await testWorkflow(container as any).run({
      input: { 
        orderId: "ord_dk", 
        fulfillmentId: "ful_ca", 
        items: [], 
        packages: [],
        originStockLocationAddress: { country_code: "CA", city: "Test City", address_1: "Test St 1", postal_code: "12345" },
        destinationShippingAddress: { country_code: "DK", city: "Dest City", address_1: "Dest St 2", postal_code: "67890" },
        orderType: "B2C"
      }
    })) as any

    expect(result.origin.countryCode).toBe("CA")
    expect(result.destination.countryCode).toBe("DK")
    expect(result.tradeType).toBe("CROSS_BORDER")
  })

  it("Test 6: Missing stock location address throws clear error", async () => {
    const container = createTestContainer()
    try {
      await testWorkflow(container as any).run({
        input: { 
          orderId: "ord_1", 
          fulfillmentId: "ful_1", 
          items: [], 
          packages: [],
          originStockLocationAddress: null,
          destinationShippingAddress: { country_code: "DK" },
          orderType: "B2C"
        },
        throwOnError: true
      })
      fail("Workflow should have thrown error")
    } catch (e: any) {
      const errorMsg = e.errors?.[0]?.error?.message || e.message
      expect(errorMsg).toMatch(/Unable to resolve fulfillment origin country/)
    }
  })

  it("Test 7: Missing order shipping address throws clear error", async () => {
    const container = createTestContainer()
    try {
      await testWorkflow(container as any).run({
        input: { 
          orderId: "ord_no_addr", 
          fulfillmentId: "ful_1", 
          items: [], 
          packages: [],
          originStockLocationAddress: { country_code: "DK" },
          destinationShippingAddress: null,
          orderType: "B2C"
        },
        throwOnError: true
      })
      fail("Workflow should have thrown error")
    } catch (e: any) {
      const errorMsg = e.errors?.[0]?.error?.message || e.message
      expect(errorMsg).toMatch(/Unable to resolve destination country/)
    }
  })
})
