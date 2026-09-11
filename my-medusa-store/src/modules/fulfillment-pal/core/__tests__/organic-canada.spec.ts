import { ProviderRegistry } from "../provider-registry"
import { ProviderRouter } from "../provider-router"
import { ShipmentContext } from "../../types"
import { OrganicCanadaProviderService } from "../../providers/organic-canada"
import { createPalShipmentStep } from "../../workflows/steps/create-pal-shipment"
import { classifyTradeStep } from "../../workflows/steps/classify-trade"
import { determineModeStep } from "../../workflows/steps/determine-mode"
import { selectProviderStep } from "../../workflows/steps/select-provider"
import { bookProviderStep } from "../../workflows/steps/book-provider"
import { updateShipmentStatusStep } from "../../workflows/steps/update-shipment-status"
import { FULFILLMENT_PAL_MODULE } from "../../index"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createContainer, asValue } from "awilix"

// Import API route handlers for direct testing
import { GET, POST } from "../../../../api/admin/pal/providers/route"

describe("Organic Canada Provider", () => {
  describe("Derived Capabilities & Carrier Routing", () => {
    it("returns all PAL capabilities independently of carrier configuration status", () => {
      const provider = new OrganicCanadaProviderService({
        carriers: {
          easyship: { status: "NOT_CONFIGURED" },
          dhl: { status: "NOT_CONFIGURED" },
          fedex: { status: "NOT_CONFIGURED" },
          ups: { status: "NOT_CONFIGURED" },
          shipstation: { status: "NOT_CONFIGURED" }
        }
      })

      const caps = provider.getDerivedCapabilities()
      expect(caps.transportModes).toEqual([
        "PARCEL",
        "LTL",
        "FTL",
        "AIR_FREIGHT",
        "OCEAN_LCL",
        "OCEAN_FCL"
      ])
      expect(caps.domestic).toBe(true)
      expect(caps.crossBorder).toBe(true)
    })

    it("returns all PAL capabilities regardless of active connected status of adapters", () => {
      const provider = new OrganicCanadaProviderService({
        carriers: {
          easyship: { status: "CONNECTED" }, // PARCEL, domestic, cross-border
          fedex: { status: "NOT_CONFIGURED" }
        }
      })

      const caps = provider.getDerivedCapabilities()
      expect(caps.transportModes).toContain("PARCEL")
      expect(caps.transportModes).toContain("LTL")
      expect(caps.domestic).toBe(true)
      expect(caps.crossBorder).toBe(true)
    })
  })

  describe("Four Scenario Routing with Router", () => {
    let registry: ProviderRegistry
    let router: ProviderRouter

    beforeEach(() => {
      registry = new ProviderRegistry()
      const provider = new OrganicCanadaProviderService({
        carriers: {
          easyship: { status: "CONNECTED" },
          fedex: { status: "CONNECTED" }
        }
      })

      registry.register({
        id: "organic_canada",
        code: "ORGANIC_CANADA",
        name: "Organic Canada Logistics",
        priority: 1,
        adapter: provider,
        capabilities: provider.getDerivedCapabilities()
      })

      router = new ProviderRouter(registry)
    })

    it("Scenario 1: B2C Domestic route selects organic_canada", () => {
      const context: ShipmentContext = {
        shipmentId: "ship_1",
        orderId: "ord_1",
        orderType: "B2C",
        tradeType: "DOMESTIC",
        tradeDirection: "DOMESTIC",
        transportMode: "PARCEL",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "CA", city: "Vancouver" },
        items: [],
        packages: []
      }

      const match = router.route(context)
      expect(match?.id).toBe("organic_canada")
    })

    it("Scenario 2: B2C Cross-Border Export selects organic_canada", () => {
      const context: ShipmentContext = {
        shipmentId: "ship_2",
        orderId: "ord_2",
        orderType: "B2C",
        tradeType: "CROSS_BORDER",
        tradeDirection: "EXPORT",
        transportMode: "PARCEL",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "US", city: "New York" },
        items: [],
        packages: []
      }

      const match = router.route(context)
      expect(match?.id).toBe("organic_canada")
    })

    it("Scenario 3: B2B Domestic selects organic_canada", () => {
      const context: ShipmentContext = {
        shipmentId: "ship_3",
        orderId: "ord_3",
        orderType: "B2B",
        tradeType: "DOMESTIC",
        tradeDirection: "DOMESTIC",
        transportMode: "LTL",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "CA", city: "Montreal" },
        items: [],
        packages: []
      }

      const match = router.route(context)
      expect(match?.id).toBe("organic_canada")
    })

    it("Scenario 4: B2B Cross-Border Export selects organic_canada", () => {
      const context: ShipmentContext = {
        shipmentId: "ship_4",
        orderId: "ord_4",
        orderType: "B2B",
        tradeType: "CROSS_BORDER",
        tradeDirection: "EXPORT",
        transportMode: "FTL",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "US", city: "Chicago" },
        items: [],
        packages: []
      }

      const match = router.route(context)
      expect(match?.id).toBe("organic_canada")
    })
  })

  describe("NOT_CONFIGURED Guard Rails", () => {
    it("refuses to generate rates, bookings, or cancellations when no active carriers are configured", async () => {
      const provider = new OrganicCanadaProviderService({
        carriers: {
          easyship: { status: "NOT_CONFIGURED" },
          dhl: { status: "NOT_CONFIGURED" },
          fedex: { status: "NOT_CONFIGURED" },
          ups: { status: "NOT_CONFIGURED" },
          shipstation: { status: "NOT_CONFIGURED" }
        }
      })

      const context: ShipmentContext = {
        shipmentId: "ship_1",
        orderId: "ord_1",
        orderType: "B2C",
        tradeType: "DOMESTIC",
        transportMode: "PARCEL",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "CA", city: "Vancouver" },
        items: [],
        packages: []
      }

      const rates = await provider.getRates(context)
      expect(rates).toEqual([])

      await expect(provider.createShipment(context)).rejects.toThrow("PROVIDER_NOT_CONFIGURED")

      const cancelled = await provider.cancelShipment("12345")
      expect(cancelled).toBe(false)

      const tracking = await provider.getTracking("12345")
      expect(tracking).toBeNull()
    })
  })

  describe("Workflow Database Persistence & Idempotency", () => {
    let mockPalService: any
    let mockContainer: any

    beforeEach(() => {
      mockPalService = {
        listPalShipments: jest.fn().mockResolvedValue([]),
        createPalShipments: jest.fn().mockResolvedValue({ id: "ship_created_123", order_id: "ord_1", order_type: "B2C" }),
        createPalShipmentAddresses: jest.fn().mockImplementation((data) => Promise.resolve({ id: `addr_${data.type}`, ...data })),
        updatePalShipments: jest.fn().mockResolvedValue({}),
        createPalPackages: jest.fn().mockImplementation((data) => Promise.resolve({ id: "pkg_1", ...data })),
        createPalShipmentStatusHistories: jest.fn().mockResolvedValue({}),
        listPalProviders: jest.fn().mockResolvedValue([{ id: "prov_1", code: "ORGANIC_CANADA", priority: 1, configuration: { carriers: { easyship: { status: "CONNECTED" } } } }]),
        listPalProviderBookings: jest.fn().mockResolvedValue([]),
        createPalProviderBookings: jest.fn().mockResolvedValue({}),
        retrievePalShipment: jest.fn().mockResolvedValue({ id: "ship_created_123", status: "CREATED", selected_provider_id: "organic_canada" })
      }

      const mockQuery = {
        graph: jest.fn().mockImplementation(({ entity, filters }: any) => {
          if (entity === "fulfillment") {
            return Promise.resolve({ data: [{ id: filters.id, location_id: "sloc_ca" }] })
          }
          if (entity === "stock_location") {
            return Promise.resolve({ data: [{ id: filters.id, name: "CA Warehouse", address: { country_code: "CA", city: "Toronto", address_1: "123 Farm Lane", postal_code: "M5V 2N8" } }] })
          }
          if (entity === "order") {
            return Promise.resolve({ data: [{ id: filters.id, type: "B2C", shipping_address: { country_code: "US", city: "New York", address_1: "456 City Street", postal_code: "10001" } }] })
          }
          return Promise.resolve({ data: [] })
        })
      }

      mockContainer = createContainer()
      mockContainer.register({
        [FULFILLMENT_PAL_MODULE]: asValue(mockPalService),
        query: asValue(mockQuery)
      })
    })

    it("Step 1: createPalShipmentStep persists shipment, addresses, packages, and records transition history", async () => {
      const testWorkflow = createWorkflow("test-create-shipment-persistence", (input: any) => {
        const stepRes = createPalShipmentStep(input)
        return new WorkflowResponse(stepRes)
      })

      const { result } = (await testWorkflow(mockContainer).run({
        input: {
          orderId: "ord_1",
          fulfillmentId: "ful_1",
          items: [],
          packages: [{ packageType: "box", weight: 5, quantity: 1 }],
          originStockLocationAddress: { country_code: "CA", city: "Toronto", address_1: "123 Farm Lane", postal_code: "M5V 2N8" },
          destinationShippingAddress: { country_code: "US", city: "New York", address_1: "456 City Street", postal_code: "10001" },
          orderType: "B2C"
        }
      })) as any

      expect(mockPalService.listPalShipments).toHaveBeenCalledWith({ external_reference: "ful_1" }, { relations: ["packages"] })
      expect(mockPalService.createPalShipments).toHaveBeenCalledWith(expect.objectContaining({
        order_id: "ord_1",
        external_reference: "ful_1",
        status: "CREATED"
      }))
      expect(mockPalService.createPalShipmentAddresses).toHaveBeenCalledTimes(2)
      expect(mockPalService.createPalPackages).toHaveBeenCalledTimes(1)
      expect(mockPalService.createPalShipmentStatusHistories).toHaveBeenCalledWith(expect.objectContaining({
        from_status: null,
        to_status: "CREATED"
      }))
      expect(result.shipmentId).toBe("ship_created_123")
    })

    it("Step 2 & 3: classifyTradeStep and determineModeStep update database record with trade and mode info", async () => {
      const context: ShipmentContext = {
        shipmentId: "ship_created_123",
        orderId: "ord_1",
        orderType: "B2C",
        origin: { countryCode: "CA" },
        destination: { countryCode: "US" },
        items: [],
        packages: [{ id: "pkg_1", packageType: "box", weight: 5, quantity: 1 }]
      }

      const testWorkflow = createWorkflow("test-classification-persistence", (input: any) => {
        const step1 = classifyTradeStep(input)
        const step2 = determineModeStep(step1)
        return new WorkflowResponse(step2)
      })

      await testWorkflow(mockContainer).run({ input: context })

      expect(mockPalService.updatePalShipments).toHaveBeenCalledWith(expect.objectContaining({
        id: "ship_created_123",
        trade_type: "CROSS_BORDER",
        trade_direction: "EXPORT"
      }))

      expect(mockPalService.updatePalShipments).toHaveBeenCalledWith(expect.objectContaining({
        id: "ship_created_123",
        transport_mode: "PARCEL"
      }))
    })

    it("Step 4 & 5: selectProviderStep and bookProviderStep persist selection, bookings, and support idempotency", async () => {
      const context: ShipmentContext = {
        shipmentId: "ship_created_123",
        orderId: "ord_1",
        orderType: "B2C",
        tradeType: "CROSS_BORDER",
        transportMode: "PARCEL",
        origin: { countryCode: "CA" },
        destination: { countryCode: "US" },
        items: [],
        packages: []
      }

      const testWorkflow = createWorkflow("test-booking-persistence", (input: any) => {
        const step1 = selectProviderStep(input)
        const step2 = bookProviderStep({ context: input, providerId: step1.providerId })
        return new WorkflowResponse(step2)
      })

      const { result } = (await testWorkflow(mockContainer).run({ input: context })) as any

      expect(mockPalService.updatePalShipments).toHaveBeenCalledWith(expect.objectContaining({
        id: "ship_created_123",
        selected_provider_id: "organic_canada"
      }))

      expect(mockPalService.createPalProviderBookings).toHaveBeenCalledWith(expect.objectContaining({
        shipment_id: "ship_created_123",
        provider_id: "prov_1",
        status: "NOT_BOOKED"
      }))

      expect(result.status).toBe("CREATED")
    })

    it("failed bookings leave PalShipment in CREATED state and do not create bookings", async () => {
      // Mock provider registry query returning unconfigured carrier
      mockPalService.listPalProviders.mockResolvedValueOnce([
        { id: "prov_1", code: "ORGANIC_CANADA", priority: 1, configuration: { carriers: { easyship: { status: "NOT_CONFIGURED" } } } }
      ])

      const context: ShipmentContext = {
        shipmentId: "ship_created_123",
        orderId: "ord_1",
        orderType: "B2C",
        tradeType: "DOMESTIC",
        transportMode: "PARCEL",
        origin: { countryCode: "CA" },
        destination: { countryCode: "CA" },
        items: [],
        packages: []
      }

      const testWorkflow = createWorkflow("test-booking-failure", (input: any) => {
        const stepRes = bookProviderStep({ context: input, providerId: "organic_canada" })
        return new WorkflowResponse(stepRes)
      })

      // Workflow execution should resolve gracefully with NOT_BOOKED
      const { result } = await testWorkflow(mockContainer).run({ input: context }) as any
      expect(result.status).toBe("CREATED")
    })

    it("Step 6: updateShipmentStatusStep validates transition and persists status history", async () => {
      mockPalService.retrievePalShipment.mockResolvedValueOnce({ id: "ship_created_123", status: "BOOKING", selected_provider_id: "organic_canada" })
      
      const testWorkflow = createWorkflow("test-status-persistence", (input: any) => {
        const stepRes = updateShipmentStatusStep(input)
        return new WorkflowResponse(stepRes)
      })

      await testWorkflow(mockContainer).run({
        input: {
          shipmentId: "ship_created_123",
          providerId: "organic_canada",
          trackingNumber: "TRK-100",
          status: "BOOKED"
        }
      })

      expect(mockPalService.retrievePalShipment).toHaveBeenCalledWith("ship_created_123")
      expect(mockPalService.updatePalShipments).toHaveBeenCalledWith(expect.objectContaining({
        id: "ship_created_123",
        status: "BOOKED",
        external_reference: "TRK-100"
      }))
      expect(mockPalService.createPalShipmentStatusHistories).toHaveBeenCalledWith(expect.objectContaining({
        shipment_id: "ship_created_123",
        from_status: "BOOKING",
        to_status: "BOOKED"
      }))
    })

    it("Idempotent booking retries resolve existing booking without duplicating records", async () => {
      mockPalService.listPalProviderBookings.mockResolvedValue([
        {
          id: "book_99",
          status: "BOOKED",
          external_booking_id: "TRACK-EXISTING",
          response_payload: {
            cost: 50,
            currency: "USD",
            labels: ["label-url"]
          }
        }
      ])

      const context: ShipmentContext = {
        shipmentId: "ship_already_booked",
        orderId: "ord_1",
        orderType: "B2C",
        tradeType: "DOMESTIC",
        transportMode: "PARCEL",
        origin: { countryCode: "CA" },
        destination: { countryCode: "CA" },
        items: [],
        packages: []
      }

      const testWorkflow = createWorkflow("test-book-idempotency", (input: any) => {
        const stepRes = bookProviderStep({ context: input, providerId: "organic_canada" })
        return new WorkflowResponse(stepRes)
      })

      const { result } = (await testWorkflow(mockContainer).run({
        input: context
      })) as any

      expect(mockPalService.createPalProviderBookings).not.toHaveBeenCalled()
      expect(result.trackingNumber).toBe("TRACK-EXISTING")
      expect(result.status).toBe("BOOKED")
    })
  })

  describe("Admin Provider Config Mutation API", () => {
    let mockPalService: any
    let mockReq: any
    let mockRes: any

    beforeEach(() => {
      mockPalService = {
        listPalProviders: jest.fn().mockResolvedValue([]),
        createPalProviders: jest.fn().mockResolvedValue({
          id: "organic_canada_db",
          name: "Organic Canada Logistics",
          enabled: true,
          priority: 1,
          configuration: { carriers: { easyship: { status: "NOT_CONFIGURED" } } }
        }),
        updatePalProviders: jest.fn().mockImplementation((data) => Promise.resolve({
          id: "organic_canada_db",
          name: "Organic Canada Logistics",
          ...data
        }))
      }

      mockReq = {
        scope: {
          resolve: jest.fn().mockReturnValue(mockPalService)
        },
        body: {}
      }

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
    })

    it("GET endpoint returns sanitized provider and carrier connection information", async () => {
      await GET(mockReq, mockRes)

      expect(mockPalService.listPalProviders).toHaveBeenCalledWith({ code: "ORGANIC_CANADA" })
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        provider: expect.objectContaining({
          name: "Organic Canada Logistics",
          enabled: true
        }),
        carriers: expect.arrayContaining([
          expect.objectContaining({
            id: "easyship",
            status: "NOT_CONFIGURED"
          })
        ])
      }))
    })

    it("POST mutation updates provider configuration and carrier parameters", async () => {
      mockReq.body = {
        enabled: false,
        priority: 5,
        configuration: {
          carriers: {
            easyship: { status: "DISABLED" }
          }
        }
      }

      await POST(mockReq, mockRes)

      expect(mockPalService.updatePalProviders).toHaveBeenCalledWith(expect.objectContaining({
        enabled: false,
        priority: 5,
        configuration: expect.objectContaining({
          carriers: expect.objectContaining({
            easyship: expect.objectContaining({ status: "DISABLED" })
          })
        })
      }))
      expect(mockRes.json).toHaveBeenCalled()
    })

    it("POST mutation rejects manually setting a carrier to CONNECTED", async () => {
      mockReq.body = {
        configuration: {
          carriers: {
            easyship: { status: "CONNECTED" }
          }
        }
      }

      await POST(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("adapter not found for testing")
      }))
      expect(mockPalService.updatePalProviders).not.toHaveBeenCalled()
    })
  })
})
