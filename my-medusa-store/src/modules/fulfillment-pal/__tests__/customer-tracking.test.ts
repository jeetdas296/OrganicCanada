import { GET } from "../../../api/store/orders/[id]/tracking/route"

describe("Customer Tracking Route - Authorization & Payload", () => {
  let mockReq: any
  let mockRes: any
  let mockQueryGraph: jest.Mock
  let mockPalService: any

  beforeEach(() => {
    mockQueryGraph = jest.fn()
    mockPalService = {
      listPalProviderBookings: jest.fn().mockResolvedValue([]),
      listPalTrackingEvents: jest.fn().mockResolvedValue([])
    }

    mockReq = {
      params: { id: "order_1" },
      auth_context: { actor_id: "cus_123" },
      scope: {
        resolve: (key: string) => {
          if (key === "query") return { graph: mockQueryGraph }
          if (key === "fulfillmentPal") return mockPalService
          return null
        }
      }
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
  })

  it("Test 1 — Customer can see own tracking (200)", async () => {
    mockQueryGraph.mockImplementation(async (args) => {
      if (args.entity === "order") {
        return { data: [{ id: "order_1", display_id: "1001", customer_id: "cus_123" }] }
      }
      if (args.entity === "pal_shipment") {
        return { data: [{ id: "ship_1", status: "BOOKED", selected_provider_id: "shiprocket" }] }
      }
      if (args.entity === "pal_shipment_timeline") {
        return { data: [{ scenario: "B2C_DOMESTIC", steps: [{ step_code: "PACKED", status: "COMPLETED" }] }] }
      }
      return { data: [] }
    })

    mockPalService.listPalProviderBookings.mockResolvedValue([{ 
      status: "BOOKED", 
      external_booking_id: "TEST-SR-12345", 
      created_at: new Date() 
    }])

    await GET(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      order: { displayId: "1001" },
      shipments: expect.arrayContaining([
        expect.objectContaining({
          shipmentId: "ship_1",
          scenario: "B2C_DOMESTIC",
          currentStatus: "BOOKED",
          carrier: { name: "shiprocket", trackingNumber: "TEST-SR-12345" }
        })
      ])
    }))
  })

  it("Test 2 — Customer cannot see another customer's tracking (403)", async () => {
    mockQueryGraph.mockImplementation(async (args) => {
      if (args.entity === "order") {
        // Order belongs to a DIFFERENT customer
        return { data: [{ id: "order_1", display_id: "1001", customer_id: "cus_999" }] }
      }
      return { data: [] }
    })

    await GET(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(403)
  })

  it("Test 3 — Unauthorized / Unauthenticated (401)", async () => {
    mockReq.auth_context = null

    await GET(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)
  })

  it("Test 4 — Multiple shipments are returned independently", async () => {
    mockQueryGraph.mockImplementation(async (args) => {
      if (args.entity === "order") {
        return { data: [{ id: "order_1", display_id: "1001", customer_id: "cus_123" }] }
      }
      if (args.entity === "pal_shipment") {
        return { data: [
          { id: "ship_1", status: "BOOKED", selected_provider_id: "shiprocket" },
          { id: "ship_2", status: "IN_TRANSIT", selected_provider_id: "dhl" }
        ]}
      }
      return { data: [] }
    })

    await GET(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    const payload = mockRes.json.mock.calls[0][0]
    expect(payload.shipments).toHaveLength(2)
    expect(payload.shipments[0].carrier.name).toBe("shiprocket")
    expect(payload.shipments[1].carrier.name).toBe("dhl")
  })
})
