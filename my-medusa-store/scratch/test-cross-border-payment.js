import fetch from "node-fetch";

async function test() {
  const backendUrl = "http://127.0.0.1:9000";
  const pubKey = "pk_1ef2d0f9f81b37e3a6a798a48dfb087669574e6a98dad2d8b6ebe770eb0c671f";

  // 1. Create a Cart
  console.log("Creating cart...");
  let res = await fetch(`${backendUrl}/store/carts`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey 
    },
    body: JSON.stringify({
      region_id: "reg_01KHBQ853M2Y917XTHGND9CS27", // Europe region
      email: "test@example.com",
      currency_code: "eur"
    })
  });
  let data = await res.json();
  const cartId = data.cart.id;
  console.log("Cart created:", cartId);

  // 2. Add an item (with a valid variant ID)
  res = await fetch(`${backendUrl}/store/products?fields=*variants`, {
    headers: { "x-publishable-api-key": pubKey }
  });
  let productsData = await res.json();
  const validVariantId = productsData.products[0].variants[0].id;
  
  console.log(`Adding valid item ${validVariantId}...`);
  res = await fetch(`${backendUrl}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({
      variant_id: validVariantId,
      quantity: 1
    })
  });

  // 3. Create Payment Collection BEFORE address update
  console.log("Creating Payment Collection BEFORE address update...");
  res = await fetch(`${backendUrl}/store/payment-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({ cart_id: cartId })
  });
  data = await res.json();
  const collectionId = data.payment_collection.id;
  // 3b. Add Shipping Method
  console.log("Setting initial shipping method for Europe...");
  res = await fetch(`${backendUrl}/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({ option_id: "so_01KV0FJ8Q8XBE6XNGTHTAG5FPJ" }) // US Standard Shipping (available in gb, de, dk, se, fr, es, it)
  });
  data = await res.json();
  // console.log("Initial Shipping Method:", data.cart.shipping_methods?.[0]?.shipping_option_id);

  // 4. Update Shipping Address to CA via Custom Endpoint
  console.log("Updating shipping address to CA...");
  res = await fetch(`${backendUrl}/store/custom-carts/${cartId}/shipping-address`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({
      shipping_address: {
        first_name: "Test",
        last_name: "User",
        address_1: "123 Maple",
        city: "Toronto",
        postal_code: "1000",
        country_code: "ca"
      }
    })
  });
  data = await res.json();
  console.log("Cart after custom address update:", data.cart.shipping_address?.country_code);

  // 5. Fetch cart and payment collection AFTER address update
  console.log("Fetching cart to check shipping method and payment collection AFTER address update...");
  res = await fetch(`${backendUrl}/store/carts/${cartId}?fields=*shipping_address,*shipping_methods,*payment_collection`, {
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
  });
  data = await res.json();
  if (data.cart.payment_collection) {
    console.log("Payment Collection exists AFTER:", data.cart.payment_collection.id);
    
    // Fetch payment providers properly for this collection
    // const ppRes = await fetch(`${backendUrl}/store/payment-collections/${data.cart.payment_collection.id}/payment-providers`, {
    //     headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    // });
    // const ppData = await ppRes.json();
    // console.log("Available Payment Providers AFTER:", ppData.payment_providers?.map(p => p.id));
  } else {
    console.log("Payment Collection DELETED or Missing AFTER!");
  }
  console.log("Shipping Methods AFTER:", data.cart.shipping_methods);

  // 6. Create Payment Session with "stripe"
  console.log("Initiating Payment Session with stripe...");
  res = await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({ provider_id: "pp_stripe_stripe" })
  });
  data = await res.json();
  console.log("Payment Session AFTER address update:", data);
}
  res = await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({ provider_id: "stripe" }) 
  });
  let sessionData = await res.json();
  console.log("Stripe Status:", res.status);

  if (!res.ok) {
    console.log("Initiating Payment Session with pp_stripe_stripe...");
    res = await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ provider_id: "pp_stripe_stripe" })
    });
    sessionData = await res.json();
    console.log("pp_stripe_stripe Status:", res.status);
    console.log("pp_stripe_stripe Response:", sessionData);
  }
}

test().catch(console.error);
