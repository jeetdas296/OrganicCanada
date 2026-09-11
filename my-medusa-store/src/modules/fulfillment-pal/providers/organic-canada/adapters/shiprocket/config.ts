export interface ShiprocketConfig {
  email?: string
  password?: string
  pickupLocationMap?: Record<string, string>
}

export function loadShiprocketConfig(options?: any): ShiprocketConfig {
  const envEmail = process.env.SHIPROCKET_API_EMAIL
  const envPassword = process.env.SHIPROCKET_API_PASSWORD

  // Fallback to options if passed dynamically (e.g., from Medusa module options)
  return {
    email: envEmail || options?.shiprocket_email || undefined,
    password: envPassword || options?.shiprocket_password || undefined,
    pickupLocationMap: options?.shiprocket_pickup_location_map || {}
  }
}

export function isShiprocketConfigured(config: ShiprocketConfig): boolean {
  return !!config.email && !!config.password
}
