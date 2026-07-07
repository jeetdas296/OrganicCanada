// src/workflows/b2b/approve-b2b-quote.ts
import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  useRemoteQueryStep,
  completeCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { B2B_MODULE } from "../../modules/b2b"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaError } from "@medusajs/framework/utils"

// ─── Step: Update Quote Status ───────────────────────────────────────────────
const updateQuoteStatusStep = createStep(
  "update-quote-status-step",
  async (
    input: { quote_id: string; status: "approved" | "rejected" },
    { container }
  ) => {
    const b2bService = container.resolve(B2B_MODULE)

    const [quote] = await b2bService.listQuotes({ id: [input.quote_id] })

    if (!quote) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Quote ${input.quote_id} not found`
      )
    }

    if (quote.status !== "pending_approval") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Quote ${input.quote_id} is not pending approval. Current status: ${quote.status}`
      )
    }

    const updated = await b2bService.updateQuotes({
      id: input.quote_id,
      status: input.status,
    })

    return new StepResponse(
      { quote: updated, previous_status: quote.status },
      { quote_id: input.quote_id, previous_status: quote.status }
    )
  },
  async (compensate, { container }) => {
    if (!compensate) return
    const b2bService = container.resolve(B2B_MODULE)
    await b2bService.updateQuotes({
      id: compensate.quote_id,
      status: compensate.previous_status,
    })
  }
)

// ─── Step: Convert Quote to Order ────────────────────────────────────────────
const convertQuoteToOrderStep = createStep(
  "convert-quote-to-order-step",
  async (input: { quote_id: string; cart_id: string }, { container }) => {
    const b2bService = container.resolve(B2B_MODULE)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    // Mark as converted
    await b2bService.updateQuotes({
      id: input.quote_id,
      status: "converted",
    })

    return new StepResponse(
      { quote_id: input.quote_id, cart_id: input.cart_id },
      { quote_id: input.quote_id }
    )
  },
  async (compensate, { container }) => {
    if (!compensate) return
    const b2bService = container.resolve(B2B_MODULE)
    await b2bService.updateQuotes({
      id: compensate.quote_id,
      status: "approved",
    })
  }
)

// ─── Step: Link Quote to Order ────────────────────────────────────────────────
const linkQuoteToOrderStep = createStep(
  "link-quote-to-order-step",
  async (
    input: { quote_id: string; order_id: string },
    { container }
  ) => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    const b2bService = container.resolve(B2B_MODULE)

    // Update quote with order_id
    await b2bService.updateQuotes({
      id: input.quote_id,
      order_id: input.order_id,
    })

    // Create remote link between quote and order
    await remoteLink.create({
      [B2B_MODULE]: {
        quote_id: input.quote_id,
      },
      order: {
        order_id: input.order_id,
      },
    })

    return new StepResponse({ linked: true })
  }
)

// ─── Approve Quote Workflow ────────────────────────────────────────────────────
export type ApproveB2BQuoteWorkflowInput = {
  quote_id: string
}

export const approveB2BQuoteWorkflow = createWorkflow(
  "approve-b2b-quote",
  function (input: ApproveB2BQuoteWorkflowInput) {
    // Step 1: Update status to approved
    const { quote } = updateQuoteStatusStep({
      quote_id: input.quote_id,
      status: "approved",
    })

    // Step 2: Convert quote (this triggers cart completion)
    const conversion = convertQuoteToOrderStep({
      quote_id: input.quote_id,
      cart_id: quote.cart_id,
    })

    // Step 3: Complete the cart → This creates the real Medusa Order
    // completeCartWorkflow is the official Medusa workflow
    const { order } = completeCartWorkflow.runAsStep({
      input: { id: quote.cart_id },
    })

    // Step 4: Link the created order back to the quote
    linkQuoteToOrderStep({
      quote_id: input.quote_id,
      order_id: order.id,
    })

    return new WorkflowResponse({
      quote,
      order,
    })
  }
)

// ─── Reject Quote Workflow ────────────────────────────────────────────────────
export type RejectB2BQuoteWorkflowInput = {
  quote_id: string
  reason?: string
}

export const rejectB2BQuoteWorkflow = createWorkflow(
  "reject-b2b-quote",
  function (input: RejectB2BQuoteWorkflowInput) {
    const { quote } = updateQuoteStatusStep({
      quote_id: input.quote_id,
      status: "rejected",
    })

    return new WorkflowResponse({ quote })
  }
)