import { GET } from "../route"
import { organicCanadaConfig } from "../../../../../modules/fulfillment-pal/providers/organic-canada/config"

describe("PAL Providers GET Admin Route", () => {
  it("Test 1: Shiprocket exists in default configuration", () => {
    expect(organicCanadaConfig.carriers.shiprocket).toBeDefined()
    expect(organicCanadaConfig.carriers.shiprocket.status).toBe("NOT_CONFIGURED")
  })

  it("Test 2 & 6: Existing database without Shiprocket exposes it via missing-key merge", async () => {
    const mockProvider = {
      id: "prov_1",
      name: "Organic Canada Logistics",
      configuration: {
        carriers: {
          dhl: { status: "NOT_CONFIGURED" },
          ups: { status: "NOT_CONFIGURED" },
          fedex: { status: "NOT_CONFIGURED" },
          easyship: { status: "NOT_CONFIGURED" },
          shipstation: { status: "NOT_CONFIGURED" }
        }
      }
    }

    const mockPalService = {
      listPalProviders: jest.fn().mockResolvedValue([mockProvider])
    }

    const req = {
      scope: {
        resolve: jest.fn().mockReturnValue(mockPalService)
      }
    } as any

    const res = {
      json: jest.fn()
    } as any

    await GET(req, res)

    expect(res.json).toHaveBeenCalled()
    const responsePayload = res.json.mock.calls[0][0]
    
    // Test 6: Verify all exist
    const carrierIds = responsePayload.carriers.map((c: any) => c.id)
    expect(carrierIds).toContain("dhl")
    expect(carrierIds).toContain("ups")
    expect(carrierIds).toContain("fedex")
    expect(carrierIds).toContain("easyship")
    expect(carrierIds).toContain("shipstation")
    expect(carrierIds).toContain("shiprocket")

    // Test 4: Shiprocket starts NOT_CONFIGURED
    const shiprocketCarrier = responsePayload.carriers.find((c: any) => c.id === "shiprocket")
    expect(shiprocketCarrier.status).toBe("NOT_CONFIGURED")
  })

  it("Test 3: Existing carrier configuration is preserved and takes precedence over defaults", async () => {
    const mockProvider = {
      id: "prov_1",
      configuration: {
        carriers: {
          dhl: {
            status: "CONNECTED",
            enabled: true,
            priority: 10
          }
        }
      }
    }

    const mockPalService = {
      listPalProviders: jest.fn().mockResolvedValue([mockProvider])
    }

    const req = {
      scope: {
        resolve: jest.fn().mockReturnValue(mockPalService)
      }
    } as any

    const res = {
      json: jest.fn()
    } as any

    await GET(req, res)

    const responsePayload = res.json.mock.calls[0][0]
    
    // DHL should retain its custom persisted configuration
    const dhlCarrier = responsePayload.carriers.find((c: any) => c.id === "dhl")
    expect(dhlCarrier.status).toBe("CONNECTED")
    expect(dhlCarrier.priority).toBe(10)
    
    // Shiprocket should still merge in
    const shiprocketCarrier = responsePayload.carriers.find((c: any) => c.id === "shiprocket")
    expect(shiprocketCarrier.status).toBe("NOT_CONFIGURED")
  })
})
