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
    if (!cart.shipping_methods || cart.shipping_methods.length === 0) {
      const optionsRes = await fetch(`http://localhost:9000/store/shipping-options?cart_id=${cart.id}`, { headers });
      const optionsData = await optionsRes.json();
      
      if (optionsData.shipping_options && optionsData.shipping_options.length > 0) {
        await fetch(`http://localhost:9000/store/carts/${cart.id}/shipping-methods`, {
          method: "POST",
          headers,
          body: JSON.stringify({ option_id: optionsData.shipping_options[0].id })
        });
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