import { POST } from "../../../api/admin/oms/shipping/[shipmentId]/booking/route"
import { DhlApiError } from "../providers/organic-canada/adapters/dhl/client"
import { OrganicCanadaProviderService } from "../providers/organic-canada/service"

export const mockBookShipment = jest.fn()

// Mock the OrganicCanadaProviderService and its carrier routing
jest.mock("../providers/organic-canada/service", () => {
  return {
    OrganicCanadaProviderService: jest.fn().mockImplementation(() => {
      return {
        routeCarrier: jest.fn().mockReturnValue({
          getIdentifier: () => "dhl",
          bookShipment: mockBookShipment
        })
      }
    })
  }
})

describe("DHL Booking Route - Idempotency & Error Normalization", () => {
  let mockReq: any
  let mockRes: any
  let mockQuery: any
  let mockPalService: any
  let mockCarrier: any

  beforeEach(() => {
    mockBookShipment.mockReset()
    mockQuery = {
      graph: jest.fn()
    }

    mockPalService = {
      listPalProviders: jest.fn().mockResolvedValue([{ id: "prov_1" }]),
      listPalProviderBookings: jest.fn().mockResolvedValue([]),
      createPalProviderBookings: jest.fn().mockResolvedValue({}),
      updatePalShipmentTimelineSteps: jest.fn().mockResolvedValue({})
    }

    mockReq = {
      params: { shipmentId: "test-shipment-123" },
      scope: {
        resolve: (key: string) => {
          if (key === "query") return mockQuery
          return mockPalService
        }
      }
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    // Default graph mock implementation for shipment and packages
    mockQuery.graph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "test-shipment-123",
            order_id: "order-1",
            selected_provider_id: "dhl",
            timelines: [{
              steps: [{
                id: "step-1",
                step_code: "BOOKING",
                status: "AVAILABLE"
              }]
            }]
          }]
        }
      }
      if (args.entity === "pal_package") {
        return { data: [] }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })
    
    mockPalService.listPalProviderBookings.mockResolvedValue([])
  })

  it("A. First DHL Booking - calls DHL and persists booking", async () => {
    mockBookShipment.mockResolvedValue({ trackingNumber: "1234567890", labels: [] })

    await POST(mockReq, mockRes)

    expect(mockBookShipment).toHaveBeenCalledTimes(1)
    expect(mockPalService.createPalProviderBookings).toHaveBeenCalledWith(expect.objectContaining({
      shipment_id: "test-shipment-123",
      status: "BOOKED",
      external_booking_id: "1234567890"
    }))
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      status: "BOOKED"
    }))
  })

  it("B. Retry DHL Booking - returns existing booking, does not call DHL", async () => {
    mockQuery.graph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "test-shipment-123",
            selected_provider_id: "dhl",
            timelines: [{ steps: [{ id: "step-1", step_code: "BOOKING", status: "COMPLETED" }] }] // Completed step!
          }]
        }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })
    
    mockPalService.listPalProviderBookings.mockResolvedValue([{ 
      status: "BOOKED", 
      response_payload: { trackingNumber: "OLD_AWB" } 
    }])

    await POST(mockReq, mockRes)

    expect(mockBookShipment).not.toHaveBeenCalled()
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      idempotent: true,
      status: "BOOKED",
      details: { trackingNumber: "OLD_AWB" }
    }))
  })

  it("C. Duplicate/Concurrent booking - returns 409 IN_PROGRESS", async () => {
    mockQuery.graph.mockImplementation(async (args: any) => {
      if (args.entity === "pal_shipment") {
        return {
          data: [{
            id: "test-shipment-123",
            selected_provider_id: "dhl",
            timelines: [{ steps: [{ id: "step-1", step_code: "BOOKING", status: "IN_PROGRESS" }] }] // In progress!
          }]
        }
      }
      if (args.entity === "order") {
        return { data: [{ id: "order-1", items: [] }] }
      }
      return { data: [] }
    })

    await POST(mockReq, mockRes)

    expect(mockBookShipment).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(409)
  })

  it("D. DHL 400 - Normalizes validation error to VALIDATION_ERROR", async () => {
    mockBookShipment.mockRejectedValue(new DhlApiError(400, "DHL API Error: Validation Failed", {
      title: "Validation Failed",
      additionalDetails: [{ source: "customerDetails.receiverDetails.postalCode", message: "Invalid postal code" }]
    }))

    await POST(mockReq, mockRes)

    expect(mockPalService.updatePalShipmentTimelineSteps).toHaveBeenCalledWith({
      id: "step-1",
      status: "AVAILABLE" // Unlocked
    })
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "VALIDATION_ERROR",
      details: expect.objectContaining({
        field: "customerDetails.receiverDetails.postalCode",
        message: "Invalid postal code"
      })
    }))
  })

  it("E. DHL 401 - Normalizes to AUTHENTICATION_ERROR", async () => {
    mockBookShipment.mockRejectedValue(new DhlApiError(401, "DHL API Error: Unauthorized"))

    await POST(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "AUTHENTICATION_ERROR"
    }))
  })

  it("F. DHL 429 - Normalizes to RATE_LIMITED", async () => {
    mockBookShipment.mockRejectedValue(new DhlApiError(429, "DHL API Error: Too Many Requests"))

    await POST(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(429)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "RATE_LIMITED"
    }))
  })

  it("G. DHL 5xx - Normalizes to PROVIDER_UNAVAILABLE", async () => {
    mockBookShipment.mockRejectedValue(new DhlApiError(503, "DHL API Error: Service Unavailable"))

    await POST(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(503)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "PROVIDER_UNAVAILABLE"
    }))
  })

  it("H. Network Timeout - Normalizes to PROVIDER_TIMEOUT", async () => {
    mockBookShipment.mockRejectedValue(new DhlApiError(504, "DHL API Error: Gateway Timeout"))

    await POST(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(504)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "PROVIDER_TIMEOUT"
    }))
  })
})
