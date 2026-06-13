"use server";
import { updateCart, initiatePaymentSession, retrieveCart} from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import { revalidateTag } from "next/cache";
// Inside your actions.ts file

// 🟢 THE FIX: A secure server action to shred the cookie
export async function clearStaleCartCookie() {
  cookies().delete("_medusa_cart_id");
}

export async function unlockStripe() {
  try {
    // 1. Fetch the cart so Medusa knows exactly which order to update
    const cart = await retrieveCart();
    if (!cart) return { success: false };

    const customer = await retrieveCustomer().catch(() => null);
    const emailToUse = customer ? customer.email : formData.get("email") || "guest@eatsie.com";
    // 2. Give Medusa a dummy address so it can calculate taxes
    await updateCart({
      email: emailToUse,
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "123 Grocery Lane",
        city: "Foodville",
        country_code: "dk", // Must match your active region!
        postal_code: "10001",
      },
    });

    // 3. Tell Medusa to wake up Stripe and generate the secret password!
    try {
      // Standard Medusa approach
      await initiatePaymentSession(cart, { provider_id: "stripe" }); 
    } catch (e) {
      // Fallback for Medusa v2 module IDs
      await initiatePaymentSession(cart, { provider_id: "pp_stripe_stripe" }); 
    }

    // 4. Refresh the Next.js page data so the Stripe box appears
    revalidateTag("cart");
    return { success: true };
  } catch (error: any) {
    // This forces Node.js to print the ENTIRE object to your terminal
    console.error("🚨 FULL MEDUSA ERROR 🚨:", JSON.stringify(error, null, 2));
    
    // We can also print the raw error just in case it's not a JSON object
    console.log("RAW ERROR:", error);

    return { success: false, error: "Check your VS Code terminal for the red error!" };
  }
}
import { cookies } from "next/headers";

export async function finalizeMedusaOrder(firstName: string, address: string) {
  try {
    const cart = await retrieveCart();
    if (!cart) return { success: false, error: "No active cart found." };

    const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
    const headers = { 
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey 
    };

    // 1. Overwrite the dummy data with the REAL address from the HTML form
    await fetch(`http://localhost:9000/store/carts/${cart.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shipping_address: {
          first_name: firstName,
          last_name: "Customer", 
          address_1: address,
          city: "Foodville", 
          country_code: "dk", 
          postal_code: "1000",
        }
      })
    });

    // 🛡️ NEW: THE SHIPPING SAFETY NET
    // If we forgot to click a shipping method during testing, automatically attach the first one!
    // 🚚 THE SMART SHIPPING AUTO-SELECTOR
if (!cart.shipping_methods || cart.shipping_methods.length === 0) {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };
  
  const optionsRes = await fetch(`http://localhost:9000/store/shipping-options?cart_id=${cart.id}`, { headers });
  const optionsData = await optionsRes.json();
  
  if (optionsData.shipping_options && optionsData.shipping_options.length > 0) {
    
    // 🟢 THE FIX: Try to find the free/digital option first!
    const freeOrDigitalOption = optionsData.shipping_options.find((opt: any) => 
      opt.amount === 0 || opt.name?.toLowerCase().includes("digital")
    );
    
    // If it finds a free one, use it. Otherwise, fallback to the first available option.
    const selectedOptionId = freeOrDigitalOption ? freeOrDigitalOption.id : optionsData.shipping_options[0].id;

    await fetch(`http://localhost:9000/store/carts/${cart.id}/shipping-methods`, {
      method: "POST",
      headers,
      body: JSON.stringify({ option_id: selectedOptionId })
    });
    // Remember to leave the cart = await retrieveCart() line here if it's in page.tsx!
  }
}

    // 2. The Magic Command: Tell Medusa to officially turn this Cart into an Order!
    const completeRes = await fetch(`http://localhost:9000/store/carts/${cart.id}/complete`, {
      method: "POST",
      headers
    });

    const completeData = await completeRes.json();

    if (completeData.type === "order") {
      // 🛑 NEXT.JS 15 FIX: We must "await" the cookies before deleting!
      (await cookies()).delete("_medusa_cart_id"); 
      return { success: true };
    } else {
      console.error("❌ Medusa Rejected Completion:", completeData);
      return { success: false, error: "Medusa failed to generate the order document." };
    }
  } catch (error: any) {
    console.error("Finalize Error:", error);
    return { success: false, error: error.message };
  }
}

export async function submitB2BQuote(cartId: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
    const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

    const res = await fetch(`${backendUrl}/store/b2b-quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
      },
      body: JSON.stringify({ cart_id: cartId }),
      cache: "no-store"
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || "Failed to generate quote on backend." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Server Action Error:", error);
    return { success: false, error: error.message };
  }
}

// 🟢 1. Accept hasDigitalItems directly from the frontend!
export async function sniperCompleteOrder(cartId: string, clientPubKey: string, hasDigitalItems: boolean) {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || clientPubKey;
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };

  try {
    // 🟢 2. No need to fetch the cart. If the frontend says it has digital items, we snipe!
    if (hasDigitalItems) {
      console.log("🕵️ [SNIPER] Mixed Cart Detected. Fetching Digital Option...");
      const optionsRes = await fetch(`${backendUrl}/store/shipping-options?cart_id=${cartId}`, { headers });
      
      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        const digitalOption = optionsData.shipping_options?.find((opt: any) => opt.amount === 0);

        if (digitalOption) {
          console.log(`🎯 [SNIPER] Attaching Digital Shipping ID: ${digitalOption.id}`);
          
          await fetch(`${backendUrl}/store/carts/${cartId}/shipping-methods`, {
            method: "POST", headers, body: JSON.stringify({ option_id: digitalOption.id })
          });

          console.log("🔄 [SNIPER] Re-initiating Stripe Payment Session...");
          await fetch(`${backendUrl}/store/carts/${cartId}/payment-sessions`, { method: "POST", headers });

          // Hardcode Stripe since we are routing from StripePayment
          await fetch(`${backendUrl}/store/carts/${cartId}/payment-session`, {
            method: "POST", headers, body: JSON.stringify({ provider_id: "stripe" })
          });
        }
      }
    }

    console.log("🚀 [SNIPER] Finalizing Order with Medusa...");
    const completeRes = await fetch(`${backendUrl}/store/carts/${cartId}/complete`, { method: "POST", headers });
    const responseText = await completeRes.text();
    
    let completeData: any = {};
    try { completeData = JSON.parse(responseText); } catch (e) {}

    if (completeRes.ok && completeData?.type === "order") {
      return { success: true, orderId: completeData.order.id };
    } 
    
    if (completeRes.ok) {
      const orderLookup = await fetch(`${backendUrl}/store/orders?cart_id=${cartId}`, { headers }).then(res => res.json());
      if (orderLookup.orders && orderLookup.orders.length > 0) {
        return { success: true, orderId: orderLookup.orders[0].id };
      }
    }

    return { success: false, error: responseText };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

// 🟢 MEDUSA V2 SESSION CREATOR
export async function setPaymentSessionAction(cartId: string, providerId: string) {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };

  try {
    // 1. Get the latest cart to find its payment_collection
    const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, { headers, cache: "no-store" });
    const { cart } = await cartRes.json();

    let collectionId = cart?.payment_collection?.id;

    // 2. V2 ARCHITECTURE: If no collection exists, create one first
    if (!collectionId) {
      const pcRes = await fetch(`${backendUrl}/store/payment-collections`, {
        method: "POST",
        headers,
        body: JSON.stringify({ cart_id: cartId }),
        cache: "no-store"
      });
      const pcData = await pcRes.json();
      collectionId = pcData.payment_collection?.id;
    }

    // 3. V2 ARCHITECTURE: Attach the Session to the Collection (NOT the cart)
    if (collectionId) {
      await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ provider_id: providerId }),
        cache: "no-store"
      });
    }
  } catch (err) {
    console.error("Set Session Error:", err);
  }
}

// 🟢 MEDUSA V2 COD CHECKOUT
export async function processCODCheckout(cartId: string) {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", "x-publishable-api-key": pubKey };

  try {
    // 1. Ensure the system provider session is set using our updated V2 logic
    await setPaymentSessionAction(cartId, "pp_system_default");

    // 2. Fetch fresh cart data to grab the newly created collection ID
    const cartRes = await fetch(`${backendUrl}/store/carts/${cartId}`, { headers, cache: "no-store" });
    const { cart } = await cartRes.json();

    const collectionId = cart?.payment_collection?.id;

    if (!collectionId) {
      throw new Error("Could not initialize COD payment collection.");
    }

    // 3. V2 ARCHITECTURE: Authorize the entire Payment Collection
    await fetch(`${backendUrl}/store/payment-collections/${collectionId}/authorize`, {
      method: "POST",
      headers,
      cache: "no-store"
    });

    // 4. Complete the Cart
    const completeRes = await fetch(`${backendUrl}/store/carts/${cartId}/complete`, {
      method: "POST",
      headers,
      cache: "no-store"
    });

    return await completeRes.json();
  } catch (err) {
    console.error("COD Checkout Action Error:", err);
    throw err;
  }
}

export async function completeCartAction(cartId: string) {
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const res = await fetch(`${backendUrl}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: {
      "x-publishable-api-key": pubKey
    },
    cache: "no-store"
  });

  const data = await res.json();
  return data;
}