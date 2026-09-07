export type OrderType = "B2C" | "B2B"
export type TradeType = "DOMESTIC" | "CROSS_BORDER"
export type TradeDirection = "DOMESTIC" | "EXPORT" | "IMPORT"
export type TransportMode = "PARCEL" | "LTL" | "FTL" | "AIR_FREIGHT" | "OCEAN_LCL" | "OCEAN_FCL"

export interface AddressContext {
  countryCode: string
  province?: string
  city?: string
  postalCode?: string
  address1?: string
  address2?: string
  company?: string
}

export interface ShipmentItemContext {
  id: string
  productId?: string
  variantId?: string
  quantity: number
  unitValue: number
  totalValue: number
  currency: string
  weight?: number
  hsCode?: string
  countryOfOrigin?: string
  description?: string
}

export interface PackageContext {
  id: string
  packageType: string
  length?: number
  width?: number
  height?: number
  dimensionUnit?: string
  weight?: number
  weightUnit?: string
  quantity: number
}

export interface ShipmentContext {
  shipmentId?: string // optional before creation
  orderId: string
  vendorId?: string
  
  orderType: OrderType
  fulfillmentId?: string
  tradeType?: TradeType // populated by TradeClassifier
  tradeDirection?: TradeDirection // populated by TradeClassifier
  
  origin: AddressContext
  destination: AddressContext
  
  items: ShipmentItemContext[]
  packages: PackageContext[]
  
  transportMode?: TransportMode // populated by TransportModeEngine
  
  incoterm?: string
  declaredValue?: number
  currency?: string
  metadata?: Record<string, unknown>
}
