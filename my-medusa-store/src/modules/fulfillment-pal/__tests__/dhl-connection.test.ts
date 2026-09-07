import { DhlAdapter } from "../providers/organic-canada/adapters/dhl"
import { DhlApiError } from "../providers/organic-canada/adapters/dhl/client"

// Mock fetch globally
global.fetch = jest.fn()

describe("DHL Connection Flow", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear()
  })

  it("1. Missing Credentials - distinguishes NOT_CONFIGURED", async () => {
    const adapter = new DhlAdapter({ enabled: true, apiUsername: "", apiPassword: "" }) // Missing credentials
    const result = await adapter.testConnection()

    // Assuming DhlConfig defaults to enabled = false if apiUsername is missing
    expect(result.status).toBe("NOT_CONFIGURED")
  })

  it("2. Invalid Credentials - distinguishes AUTHENTICATION_ERROR", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: "Unauthorized" })
    })

    const adapter = new DhlAdapter({
      enabled: true,
      apiUsername: "badUser",
      apiPassword: "badPassword"
    })

    const result = await adapter.testConnection()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.status).toBe("ERROR")
    expect(result.error).toBe("AUTHENTICATION_ERROR")
  })

  it("3. Successful Authenticated Connection - distinguishes CONNECTED", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404, // 404 on dummy tracking number means Auth Succeeded
      text: async () => JSON.stringify({ detail: "No shipment with given tracking number found." })
    })

    const adapter = new DhlAdapter({
      enabled: true,
      apiUsername: "goodUser",
      apiPassword: "goodPassword"
    })

    const result = await adapter.testConnection()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    
    // Check it used the correct Test environment URL
    const fetchCallUrl = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(fetchCallUrl).toContain("https://express.api.dhl.com/mydhlapi/test/tracking")
    
    expect(result.status).toBe("CONNECTED")
  })

  it("4. API Failure - distinguishes CONNECTION_FAILED", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ detail: "Service Unavailable" })
    })

    const adapter = new DhlAdapter({
      enabled: true,
      apiUsername: "goodUser",
      apiPassword: "goodPassword"
    })

    const result = await adapter.testConnection()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.status).toBe("ERROR")
    expect(result.error).toBe("CONNECTION_FAILED")
  })
})
