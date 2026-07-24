"use client"
import { useParams } from "next/navigation"
import { QuoteNegotiation } from "@modules/order/components/quote-negotiation"

export default function QuoteNegotiationPage() {
  const params = useParams()
  const id = params.id as string

  return <QuoteNegotiation id={id} />
}
