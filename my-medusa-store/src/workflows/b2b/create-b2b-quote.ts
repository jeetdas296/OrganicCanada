// src/workflows/b2b/create-b2b-quote.ts
import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { validateB2BCartStep } from "./steps/validate-b2b-cart"
import { createQuoteFromCartStep } from "./steps/create-quote-from-cart"
import { createDraftOrderStep } from "./steps/create-draft-order"

export type CreateB2BQuoteWorkflowInput = {
  cart_id: string
}

export const createB2BQuoteWorkflow = createWorkflow(
  "create-b2b-quote",
  function (input: CreateB2BQuoteWorkflowInput) {
    // Step 1: Validate cart is B2B and requires quote
    const validation = validateB2BCartStep({ cart_id: input.cart_id })

    // Step 2: Only proceed if this is a B2B cart requiring approval
    const quote = when(validation, (v) => v.requires_quote).then(() => {
      const createdQuote = createQuoteFromCartStep({
        cart_id: input.cart_id,
        customer_id: validation.customer_id!,
        company_id: validation.company_id || undefined,
        payment_term: validation.payment_term!,
        total: validation.cart_total,
        currency_code: validation.currency_code,
        metadata: {
          initiated_at: new Date().toISOString(),
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })

      // Step 3: Create draft order reference
      createDraftOrderStep({
        quote_id: createdQuote.id,
        cart_id: input.cart_id,
      })

      return createdQuote
    })

    return new WorkflowResponse({
      quote,
      is_b2b_quote: validation.requires_quote,
    })
  }
)