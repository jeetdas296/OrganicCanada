import { TransportMode } from "../../types"

export interface ProviderCapability {
  transportModes: TransportMode[]
  domestic: boolean
  crossBorder: boolean
  
  rating: boolean
  booking: boolean
  tracking: boolean
  label: boolean
  customs: boolean
}

import { IPalProviderAdapter } from "../../providers/provider-interface"

export interface ProviderRegistration {
  id: string
  code: string
  name: string
  capabilities: ProviderCapability
  priority: number // lower number = higher priority
  adapter?: IPalProviderAdapter
}

export class ProviderRegistry {
  private providers: Map<string, ProviderRegistration> = new Map()

  public register(provider: ProviderRegistration): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider ${provider.id} is already registered`)
    }
    this.providers.set(provider.id, provider)
  }

  public getProvider(id: string): ProviderRegistration | undefined {
    return this.providers.get(id)
  }

  public getAllProviders(): ProviderRegistration[] {
    return Array.from(this.providers.values())
  }

  public clear(): void {
    this.providers.clear()
  }
}
