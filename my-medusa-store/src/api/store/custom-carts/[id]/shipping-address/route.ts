import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { refreshCartItemsWorkflow } from "@medusajs/core-flows"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { shipping_address } = req.body as any

  if (!id) {
    return res.status(400).json({ message: "Cart ID is required" })
  }

  if (!shipping_address) {
    return res.status(400).json({ message: "shipping_address is required" })
  }

  // Optional: Could validate that user owns the cart, but Medusa's standard route handles 
  // auth inside workflows. Since this is an unauthenticated store route that operates on cart ID, 
  // relying on the hard-to-guess cart ID is typical for storefront operations, but we can do a quick check.
  const query = req.scope.resolve("query")
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id"],
    filters: { id },
  })

  const cart = carts[0]
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  // In Medusa v2, we update the address via the cart module directly
  // Bypassing updateCartWorkflow avoids the region-country strict validation
  const cartModuleService = req.scope.resolve(Modules.CART)

  try {
    const addressToUpdate = { ...shipping_address }
    if (addressToUpdate.country_code) {
      addressToUpdate.country_code = addressToUpdate.country_code.trim().toLowerCase()
    }

    await cartModuleService.updateCarts(id, {
      shipping_address: addressToUpdate
    })

    // Run the native refresh items workflow to re-trigger taxes, totals, pricing context, etc.
    // without invoking the region strictness block
    await refreshCartItemsWorkflow(req.scope).run({
      input: {
        cart_id: id,
        force_refresh: true
      }
    })

    // Fetch the updated cart to return it
    const { data: updatedCarts } = await query.graph({
      entity: "cart",
      fields: ["id", "shipping_address.*", "region.*", "total"],
      filters: { id },
    })

    return res.status(200).json({ cart: updatedCarts[0] })
  } catch (error: any) {
    console.error("Failed to update cross-border address:", error)
    return res.status(400).json({ message: error.message })
  }
}
