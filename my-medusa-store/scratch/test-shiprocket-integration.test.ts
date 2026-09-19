import { OrganicCanadaProviderService } from "../src/modules/fulfillment-pal/providers/organic-canada/service"
import { ShipmentContext } from "../src/modules/fulfillment-pal/types"

jest.mock("../src/modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket/client", () => {
  return {
    ShiprocketClient: jest.fn().mockImplementation(() => {
      return {
        config: { pickupLocationMap: { "loc_123": "Primary_WH" } },
        createOrder: jest.fn().mockResolvedValue({ order_id: 999, shipment_id: 888 }),
        assignAwb: jest.fn().mockResolvedValue({ awb_assign_status: 1, response: { data: { awb_code: "AWB999" } } }),
        requestPickup: jest.fn().mockResolvedValue({ pickup_scheduled_date: "2026-10-10" }),
        generateLabel: jest.fn().mockResolvedValue({ label_url: "http://label.pdf" }),
        cancelOrder: jest.fn().mockResolvedValue({ status_code: 200 }),
        ping: jest.fn().mockResolvedValue(true)
      }
    }),
    ShiprocketApiError: class extends Error {}
  }
})

// Mock the global PAL service instance
const mockPalService = {
  listPalProviderBookings: jest.fn(),
  updatePalProviderBookings: jest.fn(),
}

jest.mock("../src/modules/fulfillment-pal/service", () => {
  return {
    __esModule: true,
    default: {
      instance: mockPalService
    }
  }
})

describe("Shiprocket Phase B Integration Fixes", () => {
  let service: OrganicCanadaProviderService

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SHIPROCKET_API_EMAIL = "test@example.com"
    process.env.SHIPROCKET_API_PASSWORD = "password"
    
    // Instantiate orchestrator with configured carriers
    service = new OrganicCanadaProviderService({
      carriers: {
        shiprocket: { status: "CONNECTED" },
        dhl: { status: "NOT_CONFIGURED" },
        easyship: { status: "NOT_CONFIGURED" },
        fedex: { status: "NOT_CONFIGURED" },
        ups: { status: "NOT_CONFIGURED" },
        shipstation: { status: "NOT_CONFIGURED" }
      },
      shiprocket_pickup_location_map: { "loc_123": "Primary_WH" }
    })
  })

  test("Propagates Medusa location_id to Shiprocket pickupLocationMap (Blocker 3)", async () => {
    const context: ShipmentContext = {
      shipmentId: "shp_1",
      orderId: "ord_1",
      tradeType: "DOMESTIC",
      transportMode: "PARCEL",
      metadata: {
        location_id: "loc_123", // Passed from Medusa stock location
        shiprocket_courier_id: 10,
        payment_type: "prepaid"
      },
      origin: { countryCode: "IN" } as any,
      destination: { countryCode: "IN" } as any,
      packages: [{ id: "p1", quantity: 1, packageType: "box", weight: 1 }]
    }

    const result = await (service as any).bookShipment(context)
    expect(result.trackingNumber).toBe("AWB999")
    // If it didn't throw MISSING_PICKUP_LOCATION, it correctly mapped loc_123 -> Primary_WH
  })

  test("Missing pickup-location mapping throws error (Blocker 3)", async () => {
    const context: ShipmentContext = {
      shipmentId: "shp_2",
      orderId: "ord_2",
      tradeType: "DOMESTIC",
      transportMode: "PARCEL",
      metadata: {
        location_id: "loc_unmapped", // Not in map
        shiprocket_courier_id: 10,
        payment_type: "prepaid"
      },
      origin: { countryCode: "IN" } as any,
      destination: { countryCode: "IN" } as any,
      packages: [{ id: "p1", quantity: 1, packageType: "box", weight: 1 }]
    }

    await expect((service as any).bookShipment(context)).rejects.toThrow(/MISSING_PICKUP_LOCATION/)
  })

  test("Cancellation wired through orchestrator using persisted metadata (Blocker 4)", async () => {
    // Mock the DB lookup to return a booking with persisted metadata
    mockPalService.listPalProviderBookings.mockResolvedValueOnce([{
      id: "booking_1",
      external_booking_id: "AWB999",
      response_payload: {
        metadata: { 
          shiprocket_order_id: 999,
          carrier_id: "shiprocket"
        }
      }
    }])

    mockPalService.updatePalProviderBookings.mockResolvedValueOnce({})

    // Call voidShipment on the orchestrator
    const success = await (service as any).voidShipment("AWB999")
    
    expect(success).toBe(true)
    expect(mockPalService.listPalProviderBookings).toHaveBeenCalledWith({
      external_booking_id: "AWB999"
    })
    expect(mockPalService.updatePalProviderBookings).toHaveBeenCalledWith({
      id: "booking_1",
      status: "VOIDED"
    })
  })
})
