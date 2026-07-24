import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Input, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { DetailWidgetProps, AdminDraftOrder } from "@medusajs/framework/types"

import { QuoteNegotiation } from "../components/quote-negotiation"

const QuoteNegotiationWidget = ({ data: draftOrder }: DetailWidgetProps<AdminDraftOrder>) => {
  console.log("✅ Quote Negotiation Widget Loaded")
  const isB2bQuote = draftOrder.metadata?.is_b2b_quote === true || draftOrder.metadata?.is_b2b_quote === "true"

  return <QuoteNegotiation draftOrderId={draftOrder.id} isB2bQuote={isB2bQuote} />
}

export const config = defineWidgetConfig({
  zone: [
    "order.details.before",
    // @ts-ignore - draft_order.details.before is the official zone in >= 2.16.0
    "draft_order.details.before",
  ],
})

export default QuoteNegotiationWidget
