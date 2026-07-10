import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { BUNDLE_MODULE } from "../../../modules/bundle"

/**
 * GET /admin/bundles?product_id=xxx
 * Fetch bundle data for a specific product
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id as string

  if (!productId) {
    return res.status(400).json({ message: "product_id query parameter is required." })
  }

  const query = req.scope.resolve("query")

  try {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "bundle.*", "bundle.items.*"],
      filters: { id: productId },
    })

    const product = products[0]

    if (!product || !product.bundle) {
      return res.status(200).json({ is_bundle: false, bundle: null })
    }

    return res.status(200).json({
      is_bundle: true,
      bundle: product.bundle,
    })
  } catch (error: any) {
    console.error("❌ [BUNDLE GET] Error:", error.message)
    return res.status(500).json({ message: "Failed to fetch bundle data." })
  }
}

/**
 * POST /admin/bundles
 * Create or update a bundle for a product.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { product_id, title, description, items } = req.body as {
    product_id: string
    title: string
    description?: string
    items: Array<{ product_id: string; quantity: number }>
  }

  if (!product_id || !title) {
    return res.status(400).json({ message: "product_id and title are required." })
  }

  const query = req.scope.resolve("query")
  const bundleModule = req.scope.resolve(BUNDLE_MODULE)
  const remoteLink = req.scope.resolve("remoteLink")

  try {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "bundle.*", "bundle.items.*"],
      filters: { id: product_id },
    })

    const existingBundle = products[0]?.bundle

    if (existingBundle) {
      // 🟢 SAFE UPDATE FLOW
      if (existingBundle.items?.length > 0) {
        const oldItemIds = existingBundle.items.map((item: any) => item.id)
        await bundleModule.deleteBundleItems(oldItemIds)
      }

      await (bundleModule as any).updateBundles({
        id: existingBundle.id,
        title,
        description: description || null,
        metadata: existingBundle.metadata || {}, 
      })

      if (items?.length > 0) {
        for (const item of items) {
          await bundleModule.createBundleItems({
            bundle_id: existingBundle.id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
          })
        }
      }

      const updatedBundle = await bundleModule.retrieveBundle(existingBundle.id, {
        relations: ["items"],
      })

      return res.status(200).json({ success: true, bundle: updatedBundle })
    } else {
      // 🔵 SAFE CREATE FLOW
      const bundle = await bundleModule.createBundles({
        title,
        description: description || null,
        metadata: {}, 
      })

      if (items?.length > 0) {
        for (const item of items) {
          await bundleModule.createBundleItems({
            bundle_id: bundle.id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
          })
        }
      }

      await remoteLink.create([{
        [Modules.PRODUCT]: { product_id: product_id },
        [BUNDLE_MODULE]: { bundle_id: bundle.id },
      }])

      const fullBundle = await bundleModule.retrieveBundle(bundle.id, {
        relations: ["items"],
      })

      return res.status(200).json({ success: true, bundle: fullBundle })
    }
  } catch (error: any) {
    console.error("❌ [BUNDLE POST] Error:", error.message)
    return res.status(500).json({ message: "Failed to save bundle." })
  }
}