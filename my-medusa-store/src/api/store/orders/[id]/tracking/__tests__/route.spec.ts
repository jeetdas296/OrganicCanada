import { GET } from "../route"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

describe("Customer Tracking Route", () => {
  let req: Partial<MedusaRequest>
  let res: Partial<MedusaResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let queryMock: jest.Mock
  let palServiceMock: any

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    queryMock = jest.fn()

    palServiceMock = {
      listPalProviderBookings: jest.fn().mockResolvedValue([]),
      listPalTrackingEvents: jest.fn().mockResolvedValue([])
    }

    req = {
      params: { id: "ord_123" },
      auth_context: { actor_id: "cus_123" },
      scope: {
        resolve: (key: string) => {
          if (key === "query") return { graph: queryMock }
          if (key === "fulfillment_pal") return palServiceMock
        }
      }
    } as any

    res = {
      status: statusMock,
      json: jsonMock
    }
  })

  it("1. Unauthenticated access is rejected", async () => {
    (req as any).auth_context = undefined
    await GET(req as MedusaRequest, res as MedusaResponse)
    expect(statusMock).toHaveBeenCalledWith(401)
  })

  it("2. Customer IDOR protection prevents viewing other's orders", async () => {
    queryMock.mockResolvedValueOnce({
      data: [{ id: "ord_123", display_id: "123", customer_id: "cus_999" }]
    })
    await GET(req as MedusaRequest, res as MedusaResponse)
    expect(statusMock).toHaveBeenCalledWith(403)
  })

  it("3. Failed PAL shipment is excluded from customer tracking", async () => {
    queryMock.mockResolvedValueOnce({
      data: [{ id: "ord_123", display_id: "123", customer_id: "cus_123" }]
    })
    
    // Graph mock for shipments
    queryMock.mockResolvedValueOnce({
      data: [{
        id: "shp_failed",
        status: "FAILED",
        trade_type: "CROSS_BORDER"
      }]
    })

    await GET(req as MedusaRequest, res as MedusaResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      order: { displayId: "123" },
      shipments: []
    })
  })

  it("4. Valid CREATED shipment is included", async () => {
    queryMock.mockImplementation((args: any) => {
      if (args.entity === "order") {
        return Promise.resolve({ data: [{ id: "ord_123", display_id: "123", customer_id: "cus_123" }] })
      }
      if (args.entity === "pal_shipment") {
        return Promise.resolve({ data: [{ id: "shp_created", status: "CREATED", trade_type: "CROSS_BORDER" }] })
      }
      if (args.entity === "pal_shipment_timeline") {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: [] })
    })

    await GET(req as MedusaRequest, res as MedusaResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      order: { displayId: "123" },
      shipments: expect.arrayContaining([
        expect.objectContaining({ shipmentId: "shp_created", currentStatus: "CREATED" })
      ])
    })
  })

  it("5. Failed + valid shipments return only valid shipments", async () => {
    queryMock.mockImplementation((args: any) => {
      if (args.entity === "order") {
        return Promise.resolve({ data: [{ id: "ord_123", display_id: "123", customer_id: "cus_123" }] })
      }
      if (args.entity === "pal_shipment") {
        return Promise.resolve({ data: [
          { id: "shp_fail1", status: "FAILED" },
          { id: "shp_fail2", status: "FAILED" },
          { id: "shp_valid", status: "CREATED", selected_provider_id: "organic_canada" }
        ]})
      }
      return Promise.resolve({ data: [] })
    })

    await GET(req as MedusaRequest, res as MedusaResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      shipments: [
        expect.objectContaining({ shipmentId: "shp_valid" })
      ]
    }))
    expect(jsonMock.mock.calls[0][0].shipments.length).toBe(1)
  })

  it("6. Multiple valid shipments are all included", async () => {
    queryMock.mockImplementation((args: any) => {
      if (args.entity === "order") {
        return Promise.resolve({ data: [{ id: "ord_123", display_id: "123", customer_id: "cus_123" }] })
      }
      if (args.entity === "pal_shipment") {
        return Promise.resolve({ data: [
          { id: "shp_valid1", status: "CREATED" },
          { id: "shp_valid2", status: "BOOKED" }
        ]})
      }
      return Promise.resolve({ data: [] })
    })

    await GET(req as MedusaRequest, res as MedusaResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock.mock.calls[0][0].shipments.length).toBe(2)
  })
})
