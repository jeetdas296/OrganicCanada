import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/bundles?product_id=xxx
 * Public storefront endpoint: Check if a product is a bundle and return its component products
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id as string

  if (!productId) {
    return res.status(400).json({ message: "product_id query parameter is required." })
  }

  const query = req.scope.resolve("query")

  try {
    // 1. Check if this product is linked to a bundle via the Graph API
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "bundle.*", "bundle.items.*"],
      filters: { id: productId },
    })

    const product = products[0]

    if (!product || !product.bundle) {
      return res.status(200).json({ is_bundle: false, components: [] })
    }

    const bundle = product.bundle
    const bundleItems = bundle.items || []

    if (bundleItems.length === 0) {
      return res.status(200).json({ is_bundle: true, bundle_title: bundle.title, components: [] })
    }

    // 2. Fetch the full product details for each component
    const componentProductIds = bundleItems.map((item: any) => item.product_id)
    
    const { data: componentProducts } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "thumbnail"],
      filters: { id: componentProductIds },
    })

    // 3. Map the component products with their bundle quantities
    const components = bundleItems.map((item: any) => {
      const product = componentProducts.find((p: any) => p.id === item.product_id)
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        title: product?.title || "Unknown Product",
        handle: product?.handle || "",
        thumbnail: product?.thumbnail || null,
      }
    }).filter((c: any) => c.title !== "Unknown Product")

    return res.status(200).json({
      is_bundle: true,
      bundle_title: bundle.title,
      bundle_description: bundle.description,
      components,
    })
  } catch (error: any) {
    console.error("❌ [STORE BUNDLE] Error:", error.message)
    return res.status(500).json({ message: "Failed to fetch bundle data." })
  }
}
