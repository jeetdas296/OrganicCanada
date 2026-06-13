import { sdk } from "@lib/config"

export async function getBundleComponents(productId: string) {
  try {
    const response = await sdk.client.fetch(`/store/bundles?product_id=${productId}`, {
      method: "GET",
      cache: "no-store", // Always fetch fresh to accurately display bundle updates
    })
    
    return response as {
      is_bundle: boolean
      bundle_title?: string
      bundle_description?: string
      components: Array<{
        product_id: string
        quantity: number
        title: string
        handle: string
        thumbnail: string | null
      }>
    }
  } catch (error) {
    console.error("Failed to fetch bundle components:", error)
    return { is_bundle: false, components: [] }
  }
}
