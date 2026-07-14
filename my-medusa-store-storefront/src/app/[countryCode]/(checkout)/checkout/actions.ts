"use server";

import { sdk } from "@lib/config";
import {
  initiatePaymentSession,
  retrieveCart,
} from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import medusaError from "@lib/util/medusa-error";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

const APPROVAL_REQUIRED_TERMS = [
  "net_15",
  "net_30",
  "net_60",
  "net_90",
  "upon_approval",
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (Private - not exported)
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("_medusa_jwt")?.value;
  if (token) {
    return { authorization: `Bearer ${token}` };
  }
  return {};
}

function getStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": pubKey,
    ...extra,
  };
}

function isB2BQuoteRequired(cartMetadata: Record<string, unknown> | null | undefined): {
  requires_quote: boolean;
  payment_term: string | null;
  company_id: string | null;
} {
  if (!cartMetadata) {
    return { requires_quote: false, payment_term: null, company_id: null };
  }

  const is_b2b =
    cartMetadata.is_b2b === true || cartMetadata.is_b2b === "true";

  const payment_term =
    typeof cartMetadata.payment_term === "string"
      ? cartMetadata.payment_term
      : null;

  const company_id =
    typeof cartMetadata.company_id === "string"
      ? cartMetadata.company_id
      : null;

  const requires_quote =
    is_b2b &&
    payment_term !== null &&
    APPROVAL_REQUIRED_TERMS.includes(payment_term.toLowerCase());

  return { requires_quote, payment_term, company_id };
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function clearStaleCartCookie() {
  (await cookies()).delete("_medusa_cart_id");
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE PAYMENT SESSION
// ─────────────────────────────────────────────────────────────────────────────

export async function unlockStripe() {
  try {
    const cart = await retrieveCart();
    if (!cart) return { success: false };

    const rawCustomerData = await retrieveCustomer().catch(() => null);
    const customer = rawCustomerData?.customer || rawCustomerData;

    if (!customer || !customer.id) {
      return {
        success: false,
        error: "Guest checkout is disabled. Please log in.",
      };
    }

    try {
      await initiatePaymentSession(cart, { provider_id: "stripe" });
    } catch (e) {
      await initiatePaymentSession(cart, {
        provider_id: "pp_stripe_stripe",
      });
    }

    revalidateTag("cart");
    return { success: true };
  } catch (error: any) {
    console.error("🚨 unlockStripe ERROR:", JSON.stringify(error, null, 2));
    return {
      success: false,
      error: "Check your terminal for the full error details.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SESSION (V2 Architecture)
// ─────────────────────────────────────────────────────────────────────────────

export async function setPaymentSessionAction(
  cartId: string,
  providerId: string
) {
  const authHeaders = await getAuthHeaders();
  const headers = getStoreHeaders(authHeaders);

  try {
    const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, {
      headers,
      cache: "no-store",
    });
    const { cart } = await cartRes.json();

    let collectionId = cart?.payment_collection?.id;

    if (!collectionId) {
      const pcRes = await fetch(
        `${backendUrl}/store/payment-collections`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ cart_id: cartId }),
          cache: "no-store",
        }
      );
      const pcData = await pcRes.json();
      collectionId = pcData.payment_collection?.id;
    }

    if (collectionId) {
      await fetch(
        `${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ provider_id: providerId }),
          cache: "no-store",
        }
      );
    }
  } catch (err) {
    console.error("setPaymentSessionAction Error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MASTER CART COMPLETION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function completeCartB2BAware(cartId: string): Promise<
  | { type: "b2b_quote"; quote: any; message: string }
  | { type: "order"; order: any }
> {
  const authHeaders = await getAuthHeaders();
  const headers = getStoreHeaders(authHeaders);

  let cart: any = null;
  try {
    const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, {
      headers,
      cache: "no-store",
    });
    if (!cartRes.ok) throw new Error(`Cart fetch failed`);
    const cartData = await cartRes.json();
    cart = cartData.cart;
  } catch (e: any) {
    throw new Error(`Failed to retrieve cart: ${e.message}`);
  }

  if (!cart) throw new Error("Cart not found");

  const { requires_quote, payment_term } = isB2BQuoteRequired(cart.metadata);

  if (requires_quote) {
    console.log(`[B2B] Cart ${cartId} requires quote approval.`);
    const response = await fetch(`${backendUrl}/store/carts/${cartId}/complete`, {
  method: "POST",
  headers,
  cache: "no-store",
})

const data = await response.json()
if (!response.ok) throw new Error(data.message || "Failed to complete cart")

if (data.type !== "b2b_quote") {
  throw new Error(`Expected b2b_quote but got ${JSON.stringify(data)}`)
}

return { type: "b2b_quote", quote: data.quote, message: data.message || "" }

    // (await cookies()).delete("_medusa_cart_id");
    // revalidateTag("cart");

    // return {
    //   type: "b2b_quote",
    //   quote: data.quote,
    //   message: data.message || "Your order has been submitted for approval.",
    // };
  }

  console.log(`[Checkout] Completing cart ${cartId} as standard order`);

  const response = await fetch(`${backendUrl}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to complete cart");
  }

  // 🟢 THE FIX: Safely handling Medusa V2 missing order payloads without triggering 400 errors
  if (data.type === "order") {
    let finalOrder = data.order;

    if (!finalOrder || !finalOrder.id) {
      console.warn(`[Checkout] Order missing from immediate payload. Polling customer profile...`);
      
      for (let i = 0; i < 4; i++) {
        // Wait 800ms before checking the database
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        try {
          // Instead of querying by cart_id (which Medusa blocks), we query the logged-in customer's latest orders!
          const meRes = await fetch(`${backendUrl}/store/customers/me?fields=*orders`, {
            headers,
            cache: "no-store" 
          });

          if (meRes.ok) {
            const meData = await meRes.json();
            const orders = meData.customer?.orders || [];

            if (orders.length > 0) {
              // Sort by date to grab the absolute newest order they just placed
              const sortedOrders = orders.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );

              finalOrder = sortedOrders[0];
              console.log(`[Checkout] Found order ${finalOrder.id} on try ${i + 1}`);
              break;
            }
          }
        } catch (e) {
          // Silently continue polling
        }
      }
    }

    if (!finalOrder || !finalOrder.id) {
      console.warn("[Checkout] Order indexing severely delayed. Forcing fallback redirect.");
      finalOrder = { id: `processing_${cartId}` }; 
    }

    (await cookies()).delete("_medusa_cart_id");
    revalidateTag("cart");
    return { type: "order", order: finalOrder };
  }

  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// COD CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function processCODCheckout(cartId: string) {
  const authHeaders = await getAuthHeaders();
  const headers = getStoreHeaders(authHeaders);

  try {
    await setPaymentSessionAction(cartId, "pp_system_default");

    const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, {
      headers,
      cache: "no-store",
    });
    const { cart } = await cartRes.json();

    const collectionId = cart?.payment_collection?.id;

    if (!collectionId) throw new Error("Could not initialize COD payment collection.");

    await fetch(`${backendUrl}/store/payment-collections/${collectionId}/authorize`, {
        method: "POST", headers, cache: "no-store",
    });

    const result = await completeCartB2BAware(cartId);
    return result;
  } catch (err: any) {
    console.error("processCODCheckout Error:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE / MIXED CART CHECKOUT (SNIPER)
// ─────────────────────────────────────────────────────────────────────────────

export async function sniperCompleteOrder(
  cartId: string,
  clientPubKey: string,
  hasDigitalItems: boolean
): Promise<
  | { success: true; type: "order"; orderId: string }
  | { success: true; type: "b2b_quote"; quoteId: string; message: string }
  | { success: false; error: string }
> {
  try {
    console.log("🚀 [SNIPER] Running B2B-aware completion directly...");
    const result = await completeCartB2BAware(cartId);

    if (result.type === "b2b_quote") {
      return {
        success: true,
        type: "b2b_quote",
        quoteId: result.quote?.id,
        message: result.message,
      };
    }

    if (result.type === "order" && result.order?.id) {
      return {
        success: true,
        type: "order",
        orderId: result.order.id,
      };
    }

    return { success: false, error: "Unexpected completion result" };
  } catch (err: any) {
    console.error("[SNIPER] Error:", err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY / UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function completeCartAction(cartId: string) {
  try {
    const result = await completeCartB2BAware(cartId);
    return result;
  } catch (err: any) {
    console.error("completeCartAction Error:", err);
    return { success: false, error: err.message };
  }
}

export async function submitB2BQuote(cartId: string, paymentTerm: string = "net_30") {
  const authHeaders = await getAuthHeaders();
  const headers = getStoreHeaders(authHeaders);

  const normalizedTerm = paymentTerm.toLowerCase();

  try {
    const res = await fetch(`${backendUrl}/store/b2b-quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ 
        cart_id: cartId,
        payment_term: normalizedTerm 
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.message || "Failed to generate quote on backend." };
    }

    (await cookies()).delete("_medusa_cart_id");
    revalidateTag("cart");

    return { success: true, quote: data.quote };
  } catch (error: any) {
    console.error("submitB2BQuote Error:", error);
    return { success: false, error: error.message };
  }
}
export async function ensureB2BMetadataOnCart(cartId: string) {
  // 1) get customer (source of truth for "is B2B?")
  const rawCustomerData = await retrieveCustomer().catch(() => null)
  const customer = (rawCustomerData as any)?.customer || rawCustomerData

  if (!customer?.id) {
    return { success: false as const, reason: "not_logged_in" as const }
  }

  const isApprovedB2B = customer?.metadata?.b2b_status === "approved"
  if (!isApprovedB2B) {
    return { success: true as const, updated: false as const, is_b2b: false as const }
  }

  // 2) fetch cart (so we don't overwrite existing metadata / user choice)
  const authHeaders = await getAuthHeaders()
  const headers = getStoreHeaders(authHeaders)

  const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, {
    headers,
    cache: "no-store",
  })

  if (!cartRes.ok) {
    const err = await cartRes.json().catch(() => ({}))
    return {
      success: false as const,
      reason: (err?.message || "failed_to_fetch_cart") as const,
    }
  }

  const cartData = await cartRes.json()
  const cart = cartData?.cart

  const currentMetadata = (cart?.metadata as Record<string, any>) || {}

  // 3) If already marked B2B and has a payment term, do nothing (idempotent)
  const alreadyB2B =
    currentMetadata.is_b2b === true || currentMetadata.is_b2b === "true"

  const existingTerm =
    typeof currentMetadata.payment_term === "string"
      ? currentMetadata.payment_term
      : null

  if (alreadyB2B && existingTerm) {
    return {
      success: true as const,
      updated: false as const,
      is_b2b: true as const,
      payment_term: existingTerm,
    }
  }

  // 4) Otherwise set defaults ONCE (do not overwrite later)
  const defaultTerm = "net_30"

  const updateRes = await fetch(`${backendUrl}/store/carts/${cartId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      metadata: {
        ...currentMetadata,
        is_b2b: true,
        payment_term: existingTerm || defaultTerm,

        // Optional debugging fields
        b2b_customer_id: customer.id,
        b2b_status: "approved",
      },
    }),
    cache: "no-store",
  })

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}))
    return {
      success: false as const,
      reason: (err?.message || "failed_to_update_cart") as const,
    }
  }

  return {
    success: true as const,
    updated: true as const,
    is_b2b: true as const,
    payment_term: existingTerm || defaultTerm,
  }
}
export async function setB2BPaymentTerm(cartId: string, paymentTerm: string) {
  const authHeaders = await getAuthHeaders()
  const headers = getStoreHeaders(authHeaders)

  const normalized = paymentTerm.toLowerCase()

  // Only allow approved terms
  if (!APPROVAL_REQUIRED_TERMS.includes(normalized)) {
    throw new Error(`Invalid payment term: ${paymentTerm}`)
  }

  const rawCustomerData = await retrieveCustomer().catch(() => null)
  const customer = (rawCustomerData as any)?.customer || rawCustomerData

  if (!customer?.id || customer?.metadata?.b2b_status !== "approved") {
    throw new Error("Not allowed")
  }

  const res = await fetch(`${backendUrl}/store/carts/${cartId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      metadata: {
        is_b2b: true,
        payment_term: normalized,
      },
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Failed to set payment term")
  }

  return { success: true }
}