"use server"

import { getAuthHeaders } from "./cookies"

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function getQuoteNegotiation(id: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to load negotiation")
    error.status = res.status
    throw error
  }

  return await res.json()
}

export async function postQuoteNegotiationMessage(id: string, text: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to send message")
    error.status = res.status
    throw error
  }

  return await res.json()
}

export async function acceptQuoteOffer(id: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({ action: "accept" }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to accept offer")
    error.status = res.status
    throw error
  }

  return await res.json()
}
