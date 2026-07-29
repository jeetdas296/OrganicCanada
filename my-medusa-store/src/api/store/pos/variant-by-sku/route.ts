import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rawSku = req.query.sku as string | undefined

  if (!rawSku || typeof rawSku !== "string" || !rawSku.trim()) {
    return res.status(400).json({
      success: false,
      error: "SKU parameter is required and must be a valid string.",
    })
  }

  // Sanitize SKU input: remove control characters and trim
  const cleanSku = rawSku.trim().replace(/[\x00-\x1F\x7F]/g, "")

  const query = req.scope.resolve("query")

  try {
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: [
        "id",
        "title",
        "sku",
        "inventory_quantity",
        "inventory_items.*",
        "prices.*",
        "product.id",
        "product.title",
        "product.thumbnail",
      ],
      filters: {
        sku: cleanSku,
      },
    })

    if (!variants || variants.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
        sku: cleanSku,
      })
    }

    const v = variants[0] as any

    const inventoryItemIds = (v.inventory_items || [])
      .map((ii: any) => ii.inventory_item_id || ii.id)
      .filter(Boolean)

    let totalAvailableQuantity = 0
    let inventoryDataDebug: any = []

    if (inventoryItemIds.length > 0) {
      try {
        const { data: invItems } = await query.graph({
          entity: "inventory_item",
          fields: ["id", "location_levels.*"],
          filters: { id: inventoryItemIds },
        })

        inventoryDataDebug = invItems || []

        for (const item of invItems || []) {
          for (const level of (item as any)?.location_levels || []) {
            const qty = Number((level as any)?.available_quantity || 0)
            if (!isNaN(qty)) {
              totalAvailableQuantity += qty
            }
          }
        }
      } catch (err: any) {
        console.error("[variant-by-sku] Error querying inventory items:", err.message)
      }
    }

    if (totalAvailableQuantity === 0 && (v.inventory_quantity ?? 0) > 0) {
      totalAvailableQuantity = Number(v.inventory_quantity)
    }

    console.log("[variant-by-sku] SKU:", cleanSku)
    console.log("[variant-by-sku] Variant ID:", v.id)
    console.log("[variant-by-sku] Inventory data:", JSON.stringify(inventoryDataDebug, null, 2))
    console.log("[variant-by-sku] Resolved inventory quantity:", totalAvailableQuantity)

    const safeVariant = {
      id: v.id,
      title: v.title,
      sku: v.sku,
      inventory_quantity: totalAvailableQuantity,
      prices: v.prices || [],
      calculated_price: v.calculated_price || null,
      product: v.product
        ? {
          id: v.product.id,
          title: v.product.title,
          thumbnail: v.product.thumbnail || null,
        }
        : null,
      thumbnail: v.product?.thumbnail || null,
    }

    return res.status(200).json({
      success: true,
      variant: safeVariant,
      inventory: {
        inventory_quantity: safeVariant.inventory_quantity,
      },
      price: safeVariant.calculated_price || safeVariant.prices?.[0] || null,
      product: safeVariant.product,
      thumbnail: safeVariant.thumbnail,
    })
  } catch (error: any) {
    console.error("[variant-by-sku] Error fetching variant by SKU:", error)
    return res.status(500).json({
      success: false,
      error: "Internal server error while looking up variant by SKU.",
    })
  }
}
