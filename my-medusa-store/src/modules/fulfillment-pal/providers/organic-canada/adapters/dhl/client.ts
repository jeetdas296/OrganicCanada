import { DhlConfig } from "./config"

export class DhlApiError extends Error {
  public status: number
  public normalizedCode: string
  public details?: any

  constructor(status: number, message: string, details?: any) {
    super(message)
    this.name = "DhlApiError"
    this.status = status
    this.details = details
    this.normalizedCode = this.normalizeStatus(status)
  }

  private normalizeStatus(status: number): string {
    if (status === 400) return "VALIDATION_ERROR"
    if (status === 401) return "AUTHENTICATION_ERROR"
    if (status === 403) return "AUTHORIZATION_ERROR"
    if (status === 404) return "NOT_FOUND"
    if (status === 409) return "CONFLICT"
    if (status === 429) return "RATE_LIMITED"
    if (status === 408 || status === 504) return "PROVIDER_TIMEOUT"
    if (status >= 500) return "PROVIDER_UNAVAILABLE"
    return "API_ERROR"
  }
}

export class DHLClient {
  private config: DhlConfig
  private baseUrl: string

  constructor(config: DhlConfig) {
    this.config = config
    this.baseUrl = config.environment === "production" 
      ? "https://express.api.dhl.com/mydhlapi" 
      : "https://express.api.dhl.com/mydhlapi/test"
  }

  private getHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.config.apiUsername}:${this.config.apiPassword}`).toString("base64")
    return {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }

  public async getRates(payload: any): Promise<any> {
    if (!this.config.enabled) throw new Error("PROVIDER_NOT_CONFIGURED")

    const res = await fetch(`${this.baseUrl}/rates`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      let errorData: any = null
      let errorMsg = "Unknown DHL Error"
      try {
        const errorText = await res.text()
        errorData = JSON.parse(errorText)
        errorMsg = errorData?.detail || errorData?.title || errorText
      } catch (e) {
        // ignore
      }
      throw new DhlApiError(res.status, `DHL API Error: ${errorMsg}`, errorData)
    }

    return await res.json()
  }

  public async createShipment(payload: any): Promise<any> {
    if (!this.config.enabled) throw new Error("PROVIDER_NOT_CONFIGURED")

    const res = await fetch(`${this.baseUrl}/shipments`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      let errorData: any = null
      let errorMsg = "Unknown DHL Error"
      try {
        const errorText = await res.text()
        errorData = JSON.parse(errorText)
        errorMsg = errorData?.detail || errorData?.title || errorText
      } catch (e) {
        // ignore
      }
      throw new DhlApiError(res.status, `DHL API Error: ${errorMsg}`, errorData)
    }

    return await res.json()
  }

  public async trackShipment(trackingNumber: string): Promise<any> {
    if (!this.config.enabled) throw new Error("PROVIDER_NOT_CONFIGURED")

    const res = await fetch(`${this.baseUrl}/tracking?trackingNumber=${trackingNumber}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.apiUsername}:${this.config.apiPassword}`).toString("base64")}`,
        "Accept": "application/json"
      }
    })

    if (!res.ok) {
      if (res.status === 404) return null
      let errorData: any = null
      let errorMsg = "Unknown DHL Error"
      try {
        const errorText = await res.text()
        errorData = JSON.parse(errorText)
        errorMsg = errorData?.detail || errorData?.title || errorText
      } catch (e) {
        // ignore
      }
      throw new DhlApiError(res.status, `DHL API Error: ${errorMsg}`, errorData)
    }

    return await res.json()
  }

  public async ping(): Promise<boolean> {
    if (!this.config.enabled) throw new Error("PROVIDER_NOT_CONFIGURED")

    const res = await fetch(`${this.baseUrl}/tracking?trackingNumber=0000000000`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.apiUsername}:${this.config.apiPassword}`).toString("base64")}`,
        "Accept": "application/json"
      }
    })

    if (res.status === 401 || res.status === 403) {
      throw new DhlApiError(res.status, "Authentication failed")
    }

    if (!res.ok && res.status !== 404) {
      throw new DhlApiError(res.status, "Connection failed")
    }

    return true
  }
}
