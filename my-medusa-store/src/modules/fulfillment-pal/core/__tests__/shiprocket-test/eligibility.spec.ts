import { ShiprocketTestBookingExecutor } from "../../../providers/organic-canada/adapters/shiprocket/test-booking"

describe("Shiprocket Test Booking - Eligibility", () => {
  let executor: ShiprocketTestBookingExecutor

  beforeEach(() => {
    executor = new ShiprocketTestBookingExecutor()
  })

  const getBaseContext = () => ({
    shipmentId: "ship_123",
    orderId: "ord_123",
    origin: { countryCode: "CA", postalCode: "M5V" },
    destination: { countryCode: "CA", postalCode: "M4C" },
    items: [{ id: "item_1", quantity: 1, unitValue: 100 }],
    packages: [{ weight: 1, length: 10, width: 10, height: 10 }]
  })

  it("accepts B2C Domestic Parcel", async () => {
    const ctx = { ...getBaseContext(), orderType: "B2C", tradeType: "DOMESTIC", transportMode: "PARCEL" }
    const res = await executor.execute(ctx as any)
    expect(res.trackingNumber).toBeDefined()
    expect(res.metadata?.simulated).toBe(true)
  })

  it("accepts B2B Domestic Parcel", async () => {
    const ctx = { ...getBaseContext(), orderType: "B2B", tradeType: "DOMESTIC", transportMode: "PARCEL" }
    const res = await executor.execute(ctx as any)
    expect(res.trackingNumber).toBeDefined()
    expect(res.metadata?.simulated).toBe(true)
  })

  it("rejects Cross Border", async () => {
    const ctxB2c = { ...getBaseContext(), orderType: "B2C", tradeType: "CROSS_BORDER", transportMode: "PARCEL" }
    await expect(executor.execute(ctxB2c as any)).rejects.toThrow("Cross-border trade type not supported in test mode")

    const ctxB2b = { ...getBaseContext(), orderType: "B2B", tradeType: "CROSS_BORDER", transportMode: "PARCEL" }
    await expect(executor.execute(ctxB2b as any)).rejects.toThrow("Cross-border trade type not supported in test mode")
  })

  it("rejects non-parcel transport modes (LTL, FTL, AIR, OCEAN)", async () => {
    const modes = ["LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]
    for (const mode of modes) {
      const ctx = { ...getBaseContext(), orderType: "B2B", tradeType: "DOMESTIC", transportMode: mode }
      await expect(executor.execute(ctx as any)).rejects.toThrow("Transport mode not supported in test mode")
    }
  })
})
