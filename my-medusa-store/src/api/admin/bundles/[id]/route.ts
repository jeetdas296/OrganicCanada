import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { BUNDLE_MODULE } from "../../../../modules/bundle"

/**
 * GET /admin/bundles/:id
 * Retrieve a specific bundle by ID with its items
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const bundleId = req.params.id
  const bundleModule = req.scope.resolve(BUNDLE_MODULE)

  try {
    const bundle = await bundleModule.retrieveBundle(bundleId, {
      relations: ["items"],
    })

    return res.status(200).json({ bundle })
  } catch (error: any) {
    console.error("❌ [BUNDLE GET/:id] Error:", error.message)
    return res.status(404).json({ message: "Bundle not found." })
  }
}

/**
 * DELETE /admin/bundles/:id
 * Delete a bundle and clean up the product link
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const bundleId = req.params.id
  const bundleModule = req.scope.resolve(BUNDLE_MODULE)
  const remoteLink = req.scope.resolve("remoteLink")

  try {
    // 1. Retrieve the bundle to get its items
    const bundle = await bundleModule.retrieveBundle(bundleId, {
      relations: ["items"],
    })

    // 2. Delete all bundle items first
    if (bundle.items?.length > 0) {
      const itemIds = bundle.items.map((item: any) => item.id)
      await bundleModule.deleteBundleItems(itemIds)
    }

    // 3. Dismiss the remote link (Product ↔ Bundle)
    await remoteLink.dismiss({
      [BUNDLE_MODULE]: { bundle_id: bundleId },
    })

    // 4. Delete the bundle itself
    await bundleModule.deleteBundles(bundleId)

    return res.status(200).json({ success: true, message: "Bundle deleted." })
  } catch (error: any) {
    console.error("❌ [BUNDLE DELETE] Error:", error.message)
    return res.status(500).json({ message: "Failed to delete bundle." })
  }
}
