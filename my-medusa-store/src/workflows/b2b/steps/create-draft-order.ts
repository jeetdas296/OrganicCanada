// src/workflows/b2b/steps/create-draft-order.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { B2B_MODULE } from "../../../modules/b2b"

export type CreateDraftOrderInput = {
  quote_id: string
  cart_id: string
}

export const createDraftOrderStep = createStep(
  "create-draft-order-step",
  async (input: CreateDraftOrderInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    // Fetch cart details to build draft order
    const { data: carts } = await query.graph({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: [
        "id",
        "items.*",
        "shipping_address.*",
        "billing_address.*",
        "region_id",
        "currency_code",
        "customer_id",
        "metadata",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
      ],
    })

    const cart = carts?.[0]
    if (!cart) {
      throw new Error(`Cart ${input.cart_id} not found for draft order`)
    }

    // Store draft order reference in quote metadata
    // We store the cart_id as the draft reference since Medusa v2
    // uses cart as the draft mechanism before order completion
    const b2bService = container.resolve(B2B_MODULE)
    
    await b2bService.updateQuotes({
      id: input.quote_id,
      draft_order_id: input.cart_id, // Cart IS the draft in Medusa v2
      metadata: {
        draft_created_at: new Date().toISOString(),
        cart_snapshot: {
          total: (cart as any).total,
          item_count: cart.items?.length || 0,
        },
      },
    })

    return new StepResponse({
      draft_order_id: input.cart_id,
      quote_id: input.quote_id,
    })
  }
)