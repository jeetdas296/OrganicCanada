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

export async function postQuoteNegotiationMessage(id: string, text: string, vendorId?: string) {
  const authHeaders = await getAuthHeaders()

  const payload: any = { text }
  if (vendorId) {
    payload.vendor_id = vendorId
  }

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify(payload),
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
    body: JSON.stringify({ action: "final_accept" }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to finalize offer")
    error.status = res.status
    const errJson = await res.json().catch(() => ({}))
    if (errJson.message) error.message = errJson.message
    throw error
  }

  return await res.json()
}

export async function acceptVendorProposal(id: string, vendorId: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({ action: "accept", vendor_id: vendorId }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to accept vendor proposal")
    error.status = res.status
    const errJson = await res.json().catch(() => ({}))
    if (errJson.message) error.message = errJson.message
    throw error
  }

  return await res.json()
}

export async function rejectVendorProposal(id: string, vendorId: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/negotiation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({ action: "reject", vendor_id: vendorId }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to reject vendor proposal")
    error.status = res.status
    const errJson = await res.json().catch(() => ({}))
    if (errJson.message) error.message = errJson.message
    throw error
  }

  return await res.json()
}

export async function payQuoteOffer(id: string, paymentIntentId?: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({
      payment_intent_id: paymentIntentId,
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to process payment")
    error.status = res.status
    throw error
  }

  return await res.json()
}

export async function initiateQuotePaymentSession(id: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/payment-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify({}),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to initialize payment session for B2B quote")
    error.status = res.status
    throw error
  }

  return await res.json()
}

export async function getQuoteProposal(id: string) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/proposal`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to load Proposal Agreement")
    error.status = res.status
    throw error
  }

  return await res.json()
}

export async function updateQuoteProposal(id: string, payload: any) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${backendUrl}/store/b2b-quotes/${id}/proposal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!res.ok) {
    const error: any = new Error("Failed to update Proposal Agreement")
    error.status = res.status
    const errJson = await res.json().catch(() => ({}))
    if (errJson.message) error.message = errJson.message
    throw error
  }

  return await res.json()
}

export async function searchStoreCatalogProducts(query: string, currencyCode: string = "usd", quoteId?: string) {
  const authHeaders = await getAuthHeaders()
  const params = new URLSearchParams({
    q: query,
    currency_code: currencyCode,
  })
  if (quoteId) {
    params.set("quote_id", quoteId)
  }
  const res = await fetch(`${backendUrl}/store/b2b-quotes/products?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
      ...authHeaders,
    },
    cache: "no-store",
  })
  if (!res.ok) {
    return { variants: [] }
  }
  return await res.json()
}


