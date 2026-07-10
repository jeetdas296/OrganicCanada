const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"

// ✅ Use POS-specific publishable key if available, fallback to default
const POS_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_POS_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""

const DEFAULT_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || ""

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

function getClientCookie(name: string) {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    if (match) return match[2]
  }
  return null
}

// ✅ Use POS key and token for POS operations
function getPOSHeaders() {
  const token = getClientCookie("pos_token")
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": POS_PUBLISHABLE_KEY,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

// ✅ Use default key for browsing products
function getStoreHeaders() {
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": DEFAULT_PUBLISHABLE_KEY,
  }
}

export async function createPOSOrder(input: CreatePOSOrderInput) {
  try {
    const url = `${BACKEND_URL}/store/pos/`

    console.log("[POS] Creating order at:", url)
    console.log("[POS] Using POS key:", POS_PUBLISHABLE_KEY ? "Set (" + POS_PUBLISHABLE_KEY.substring(0, 10) + "...)" : "MISSING")

    const response = await fetch(url, {
      method: "POST",
      headers: getPOSHeaders(),
      body: JSON.stringify({
        currency_code: input.currency_code || "eur",
        items: input.items,
        customer_id: input.customer_id,
        payment_method: input.payment_method || "card",
        pos_terminal_id: input.pos_terminal_id || "web-pos-1",
      }),
    })

    console.log("[POS] Response status:", response.status)
    console.log("[POS] Content-Type:", response.headers.get("content-type"))

    // ✅ Get text first, then parse JSON
    const responseText = await response.text()

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[POS] HTML Response (first 300 chars):", responseText.substring(0, 300))
      throw new Error(
        "Backend returned HTML instead of JSON. " +
        "This means the /store/pos/orders route does NOT exist on the backend. " +
        "Create the file: my-medusa-store/src/api/store/pos/route.ts"
      )
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to create POS order (HTTP " + response.status + ")")
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("[POS] Order creation failed:", error.message)
    return { success: false, error: error.message }
  }
}

export async function listPOSOrders(location?: string) {
  try {
    const url = location
      ? `${BACKEND_URL}/store/pos/?location=${location}`
      : `${BACKEND_URL}/store/pos/`

    const response = await fetch(url, {
      method: "GET",
      headers: getPOSHeaders(),
    })

    const text = await response.text()
    const data = JSON.parse(text)
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
      headers: getStoreHeaders(),
    })
    const text = await response.text()
    const data = JSON.parse(text)
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
      headers: getStoreHeaders(),
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