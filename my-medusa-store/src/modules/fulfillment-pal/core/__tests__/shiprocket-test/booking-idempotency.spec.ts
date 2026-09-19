import { POST } from "../../../../../api/admin/oms/shipping/[shipmentId]/booking/route"
import { OrganicCanadaProviderService } from "../../../providers/organic-canada/service"

jest.mock("../../../providers/organic-canada/service")

describe("Shiprocket Test Booking - API Route & Idempotency", () => {
  let mockQueryGraph: jest.Mock
  let mockPalService: any
  let req: any
  let res: any

  beforeEach(() => {
    mockQueryGraph = jest.fn()
    mockPalService = {
      listPalProviders: jest.fn().mockResolvedValue([{ id: "prov_1" }]),
      listPalProviderBookings: jest.fn().mockResolvedValue([]),
      createPalProviderBookings: jest.fn().mockResolvedValue({}),
      updatePalShipmentTimelineSteps: jest.fn().mockResolvedValue({})
    }

    req = {
      scope: {
        resolve: (key: string) => {
          if (key === "query") return { graph: mockQueryGraph }
          return mockPalService
        }
      },
      params: { shipmentId: "ship_1" },
      body: { mode: "TEST" }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    mockQueryGraph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "ship_1",
            order_id: "ord_1",
            selected_provider_id: "shiprocket",
          }]
        }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })
  })

  it("returns existing booking on subsequent call (idempotency)", async () => {
    mockQueryGraph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "ship_1",
            order_id: "ord_1",
            selected_provider_id: "shiprocket",
            order_type: "B2C",
            trade_type: "DOMESTIC",
            transport_mode: "PARCEL"
          }]
        }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })
    
    mockPalService.listPalProviderBookings.mockResolvedValue([{
      id: "booking_1",
      response_payload: { trackingNumber: "TEST-SR-ship_1", metadata: { simulated: true } }
    }])

    const mockCarrier = {
      getIdentifier: () => "shiprocket",
      bookShipment: jest.fn()
    }
    ;(OrganicCanadaProviderService.prototype.routeCarrier as jest.Mock).mockReturnValue(mockCarrier)

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      idempotent: true,
      details: expect.objectContaining({ trackingNumber: "TEST-SR-ship_1" })
    }))
    expect(mockCarrier.bookShipment).not.toHaveBeenCalled()
    expect(mockPalService.createPalProviderBookings).not.toHaveBeenCalled()
  })

  it("blocks REAL mode for safety", async () => {
    req.body = { mode: "REAL" }
    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining("REAL booking mode is explicitly blocked")
    }))
  })

  it("requires carrier to be shiprocket for TEST mode", async () => {
    mockQueryGraph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "ship_1",
            selected_provider_id: "dhl",
          }]
        }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining("Test booking is only supported for Shiprocket")
    }))
  })
})
