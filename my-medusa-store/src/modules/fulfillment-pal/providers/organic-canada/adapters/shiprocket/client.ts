import { ShiprocketConfig } from "./config"

export class ShiprocketApiError extends Error {
  public status: number
  public details: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = "ShiprocketApiError"
    this.status = status
    this.details = details
  }
}

interface CachedToken {
  token: string
  expiresAt: number
}

export class ShiprocketClient {
  public config: ShiprocketConfig
  private baseUrl = "https://apiv2.shiprocket.in/v1/external"
  
  // Static cache shared across instances if multiple are instantiated during the server lifecycle
  private static tokenCache: CachedToken | null = null

  constructor(config: ShiprocketConfig) {
    this.config = config
  }

  private async getAuthToken(): Promise<string> {
    const now = Date.now()
    
    // Check if we have a valid cached token (buffer of 5 minutes before actual expiry)
    if (ShiprocketClient.tokenCache && ShiprocketClient.tokenCache.expiresAt > now + 5 * 60 * 1000) {
      return ShiprocketClient.tokenCache.token
    }

    if (!this.config.email || !this.config.password) {
      throw new ShiprocketApiError("Shiprocket API credentials are not configured.", 401)
    }

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new ShiprocketApiError(
        err.message || "Failed to authenticate with Shiprocket API",
        response.status,
        err
      )
    }

    const data = await response.json()
    const token = data.token
    
    // Shiprocket token is valid for 10 days (240 hours). We cache it for 9 days to be safe.
    const expiresInMs = 9 * 24 * 60 * 60 * 1000 
    ShiprocketClient.tokenCache = {
      token,
      expiresAt: now + expiresInMs
    }

    return token
  }

  public async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken()
    
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      let errDetails = {}
      try {
        errDetails = await response.json()
      } catch (e) {
        errDetails = await response.text()
      }
      throw new ShiprocketApiError(`Shiprocket API Error: ${response.statusText}`, response.status, errDetails)
    }

    return response.json()
  }

  public async ping(): Promise<boolean> {
    // Calling an innocuous endpoint or just ensuring auth succeeds
    const token = await this.getAuthToken()
    return !!token
  }

  public async createOrder(payload: any): Promise<any> {
    return this.request("/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify(payload)
    })
  }

  public async assignAwb(payload: any): Promise<any> {
    return this.request("/courier/assign/awb", {
      method: "POST",
      body: JSON.stringify(payload)
    })
  }

  public async requestPickup(payload: any): Promise<any> {
    return this.request("/courier/generate/pickup", {
      method: "POST",
      body: JSON.stringify(payload)
    })
  }

  public async generateLabel(payload: any): Promise<any> {
    return this.request("/courier/generate/label", {
      method: "POST",
      body: JSON.stringify(payload)
    })
  }

  public async cancelOrder(payload: any): Promise<any> {
    return this.request("/orders/cancel", {
      method: "POST",
      body: JSON.stringify(payload)
    })
  }

  public async trackAwb(awbCode: string): Promise<any> {
    return this.request(`/courier/track/awb/${awbCode}`, {
      method: "GET"
    })
  }
}
