// src/workflows/b2b/steps/validate-b2b-cart.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaError } from "@medusajs/framework/utils"

export type ValidateB2BCartInput = {
  cart_id: string
}

export type ValidateB2BCartOutput = {
  is_b2b: boolean
  payment_term: string | null
  customer_id: string | null
  company_id: string | null
  requires_quote: boolean
}

// These payment terms require approval before order creation
const APPROVAL_REQUIRED_PAYMENT_TERMS = [
  "net_30",
  "net_60",
  "net_90",
  "net_15",
  "upon_approval",
]

export const validateB2BCartStep = createStep(
  "validate-b2b-cart-step",
  async (input: ValidateB2BCartInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: carts } = await query.graph({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: [
        "id",
        "metadata",
        "customer_id",
        "total",
        "currency_code",
        "customer.*",
      ],
    })

    const cart = carts?.[0]

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart ${input.cart_id} not found`
      )
    }

    const metadata = (cart.metadata as Record<string, unknown>) || {}
    
    // Use customer metadata to determine B2B status, falling back to cart metadata
    const is_b2b_customer = cart.customer?.metadata?.b2b_status === "approved"
    const is_b2b = is_b2b_customer || metadata.is_b2b === true || metadata.is_b2b === "true"
    const payment_term = (metadata.payment_term as string) || null
    const company_id = (metadata.company_id as string) || null

    const requires_quote =
      is_b2b &&
      payment_term !== null &&
      APPROVAL_REQUIRED_PAYMENT_TERMS.includes(payment_term.toLowerCase())

    return new StepResponse({
      is_b2b,
      payment_term,
      customer_id: cart.customer_id || null,
      company_id,
      requires_quote,
      cart_total: (cart as any).total,
      currency_code: cart.currency_code,
    })
  }
)