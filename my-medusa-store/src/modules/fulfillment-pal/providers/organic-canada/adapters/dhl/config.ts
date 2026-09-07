export interface DhlConfig {
  enabled: boolean
  environment: "test" | "production"
  apiUsername?: string
  apiPassword?: string
  accountNumber?: string
}

export const loadDhlConfig = (overrideConfig?: Partial<DhlConfig>): DhlConfig => {
  const envConfig: Partial<DhlConfig> = {
    enabled: process.env.DHL_ENABLED === "true",
    environment: (process.env.DHL_ENVIRONMENT as "test" | "production") || "test",
    apiUsername: process.env.DHL_API_USERNAME,
    apiPassword: process.env.DHL_API_PASSWORD,
    accountNumber: process.env.DHL_ACCOUNT_NUMBER,
  }

  // Override env config with explicitly passed config (e.g. from Medusa Provider Options)
  return {
    enabled: overrideConfig?.enabled ?? envConfig.enabled ?? false,
    environment: overrideConfig?.environment || envConfig.environment || "test",
    apiUsername: overrideConfig?.apiUsername ?? envConfig.apiUsername,
    apiPassword: overrideConfig?.apiPassword ?? envConfig.apiPassword,
    accountNumber: overrideConfig?.accountNumber ?? envConfig.accountNumber,
  }
}

export const isDhlConfigured = (config: DhlConfig): boolean => {
  return !!(config.enabled && config.apiUsername && config.apiPassword && config.accountNumber)
}
