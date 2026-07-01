import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /admin/erp/sync/product/:id
 * Manually syncs all variants of a product to ERPNext.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const erpModuleService = req.scope.resolve("erp")
  const query = req.scope.resolve("query")
  const userId = (req as any).auth_context?.actor_id

  try {
    // Security: Block vendors from triggering ERP syncs
    if (userId) {
      const { data: users } = await query.graph({
        entity: "user",
        fields: ["id", "vendor.id"],
        filters: { id: userId }
      })
      if (users[0]?.vendor?.id) {
        return res.status(403).json({ message: "Forbidden. Vendors cannot access ERP functions." })
      }
    }

    // Fetch all variants of the product with prices and product details
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "variants.id",
        "variants.sku",
        "variants.title",
        "variants.prices.*"
      ],
      filters: { id }
    })

    const product = products[0]
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." })
    }

    const syncedVariants = []
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (!variant.sku) continue
        
        const priceAmount = variant.prices?.[0]?.amount

        try {
          const erpCode = await erpModuleService.syncProductVariant({
            id: variant.id,
            sku: variant.sku,
            title: variant.title,
            product: {
              title: product.title,
              description: product.description || undefined,
            },
            price: priceAmount,
          })
          syncedVariants.push({ variant_id: variant.id, erp_code: erpCode, success: true })
        } catch (variantError: any) {
          syncedVariants.push({ variant_id: variant.id, success: false, error: variantError.message })
        }
      }
    }

    return res.status(200).json({ success: true, synced_variants: syncedVariants })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
