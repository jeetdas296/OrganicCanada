// src/workflows/b2b/steps/create-quote-from-cart.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { B2B_MODULE } from "../../../modules/b2b"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type CreateQuoteFromCartInput = {
  cart_id: string
  customer_id: string
  company_id?: string
  payment_term: string
  total: number
  currency_code: string
  metadata?: Record<string, unknown>
  expires_at?: Date
}

export const createQuoteFromCartStep = createStep(
  "create-quote-from-cart-step",
  async (input: CreateQuoteFromCartInput, { container }) => {
    const b2bService = container.resolve(B2B_MODULE)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const quote = await b2bService.createQuotes({
      cart_id: input.cart_id,
      customer_id: input.customer_id,
      company_id: input.company_id,
      payment_term: input.payment_term,
      total: input.total,
      currency_code: input.currency_code,
      status: "pending_approval",
      metadata: input.metadata || {},
      expires_at: input.expires_at,
    })

    // Link Quote → Cart
    await remoteLink.create({
      [B2B_MODULE]: {
        quote_id: quote.id,
      },
      "cart": {
        cart_id: input.cart_id,
      },
    })

    return new StepResponse(quote, { quote_id: quote.id })
  },
  async (compensate, { container }) => {
    if (!compensate?.quote_id) return
    const b2bService = container.resolve(B2B_MODULE)
    await b2bService.deleteQuotes(compensate.quote_id)
  }
)