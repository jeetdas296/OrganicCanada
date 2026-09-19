import { ShiprocketTestBookingExecutor } from "../../../providers/organic-canada/adapters/shiprocket/test-booking"
import { ShiprocketAdapter } from "../../../providers/organic-canada/adapters/shiprocket/index"
import { ShiprocketClient } from "../../../providers/organic-canada/adapters/shiprocket/client"

describe("Shiprocket Test Booking - Safety", () => {
  it("does not call live ShiprocketClient methods during test execution", async () => {
    const adapter = new ShiprocketAdapter()
    adapter.status = "CONNECTED" // Bypass config check
    
    // Spy on client methods
    const createOrderSpy = jest.spyOn(ShiprocketClient.prototype, "createOrder")
    const assignAwbSpy = jest.spyOn(ShiprocketClient.prototype, "assignAwb")

    const ctx = {
      shipmentId: "ship_123",
      orderId: "ord_123",
      orderType: "B2C",
      tradeType: "DOMESTIC",
      transportMode: "PARCEL",
      origin: { countryCode: "CA", postalCode: "M5V" },
      destination: { countryCode: "CA", postalCode: "M4C" },
      items: [{ id: "item_1", quantity: 1, unitValue: 100 }],
      packages: [{ weight: 1, length: 10, width: 10, height: 10 }],
      metadata: { bookingMode: "TEST" } // Trigger test mode
    }

    const res = await adapter.bookShipment(ctx as any)

    expect(res.metadata?.simulated).toBe(true)
    expect(createOrderSpy).not.toHaveBeenCalled()
    expect(assignAwbSpy).not.toHaveBeenCalled()
  })
})
