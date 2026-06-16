"use server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export interface POSOrderItem {
  variant_id: string
  quantity: number
  unit_price: number
  title: string
  thumbnail?: string
  sku?: string
}

export interface CreatePOSOrderInput {
  currency_code?: string
  items: POSOrderItem[]
  customer_id?: string
  payment_method?: "cash" | "card" | "mobilepay"
  pos_terminal_id?: string
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
  }
}

export async function createPOSOrder(input: CreatePOSOrderInput) {
  try {
    const response = await fetch(`${BACKEND_URL}/store/pos/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        currency_code: input.currency_code || "eur",
        items: input.items,
        customer_id: input.customer_id,
        payment_method: input.payment_method || "card",
        pos_terminal_id: input.pos_terminal_id || "web-pos-1",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create POS order")
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    console.error("[POS] Order creation failed:", error)
    return { success: false, error: error.message }
  }
}

export async function listPOSOrders(location?: string) {
  try {
    const url = location
      ? `${BACKEND_URL}/store/pos/orders?location=${location}`
      : `${BACKEND_URL}/store/pos/orders`

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch POS orders")
    }

    const data = await response.json()
    return { success: true, orders: data.pos_orders || [] }
  } catch (error: any) {
    console.error("[POS] Failed to fetch orders:", error)
    return { success: false, orders: [], error: error.message }
  }
}

// ✅ NEW: Get default region ID
export async function getDefaultRegion() {
  try {
    const response = await fetch(`${BACKEND_URL}/store/regions?limit=1`, {
      method: "GET",
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch regions")
    }

    const data = await response.json()
    return { success: true, region: data.regions?.[0] || null }
  } catch (error: any) {
    console.error("[POS] Failed to fetch regions:", error)
    return { success: false, region: null }
  }
}

// ✅ UPDATED: Accept region_id parameter
export async function searchProducts(query: string, regionId?: string) {
  try {
    // If no region_id provided, fetch the default one
    let activeRegionId = regionId
    if (!activeRegionId) {
      const regionResult = await getDefaultRegion()
      activeRegionId = regionResult.region?.id
    }

    if (!activeRegionId) {
      return {
        success: false,
        products: [],
        error: "No region available. Please create a region in Admin.",
      }
    }

    const fields = [
      "id",
      "title",
      "thumbnail",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.calculated_price",
      "variants.prices",
    ].join(",")

    // ✅ Include region_id in the query
    const url = `${BACKEND_URL}/store/products?q=${encodeURIComponent(
      query
    )}&limit=20&region_id=${activeRegionId}&fields=${encodeURIComponent(fields)}`

    console.log("[POS] Searching with region:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[POS] Search failed:", errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log("[POS] Found products:", data.products?.length || 0)

    return { success: true, products: data.products || [] }
  } catch (error: any) {
    console.error("[POS] Product search failed:", error)
    return { success: false, products: [], error: error.message }
  }
}