import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { QuoteNegotiation } from "../components/quote-negotiation"

const QuoteNegotiationWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const isB2bQuote = order.metadata?.is_b2b_quote === true || order.metadata?.is_b2b_quote === "true"

  return <QuoteNegotiation draftOrderId={order.id} isB2bQuote={isB2bQuote} />
}

export const config = defineWidgetConfig({
  zone: "order.details.before"
})

export default QuoteNegotiationWidget