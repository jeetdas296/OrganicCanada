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
  async function updateAddress(countryCode, isDomestic) {
    const endpoint = isDomestic 
      ? `${backendUrl}/store/carts/${cartId}`
      : `${backendUrl}/store/custom-carts/${cartId}/shipping-address`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({
        shipping_address: {
          first_name: "Test",
          last_name: "User",
          address_1: "123 Main St",
          city: "Testville",
          postal_code: "1000",
          country_code: countryCode.toLowerCase()
        }
      })
    });
    if (!res.ok) {
        console.log(`Failed to update to ${countryCode}:`, res.status, await res.text());
        return null;
    }
    return await res.json();
  }

  async function getCart() {
    const res = await fetch(`${backendUrl}/store/carts/${cartId}?fields=*shipping_address,*shipping_methods,*payment_collection,*payment_collection.payment_sessions,*items,*promotions`, {
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    });
    return await res.json();
  }
  
  async function getShippingOptions() {
    const res = await fetch(`${backendUrl}/store/shipping-options?cart_id=${cartId}`, {
      headers: { "x-publishable-api-key": pubKey }
    });
    return await res.json();
  }

  async function setShippingMethod(optionId) {
    const res = await fetch(`${backendUrl}/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ option_id: optionId })
    });
    if (!res.ok) {
        console.log(`Failed to set shipping method:`, res.status, await res.text());
        return null;
    }
    return await res.json();
  }

  async function auditState(stepName) {
    console.log(`\n=================== AUDIT: ${stepName} ===================`);
    const cartData = await getCart();
    const c = cartData.cart;
    console.log("[CART] Shipping Country:", c.shipping_address?.country_code);
    console.log("[CART] Region ID:", c.region_id);
    console.log("[CART] Currency Code:", c.currency_code);
    console.log("[CART] Subtotal:", c.subtotal, "Shipping Total:", c.shipping_total, "Total:", c.total);
    console.log("[CART] Shipping Methods:", c.shipping_methods?.map(sm => ({id: sm.id, option_id: sm.shipping_option_id})));
    
    const opts = await getShippingOptions();
    console.log("[SHIPPING OPTIONS] Count:", opts.shipping_options?.length);
    console.log("[SHIPPING OPTIONS] IDs:", opts.shipping_options?.map(o => o.id));

    console.log("[PAYMENT COLLECTION] ID:", c.payment_collection?.id);
    if (c.payment_collection?.id) {
        console.log("[PAYMENT SESSIONS] Count:", c.payment_collection?.payment_sessions?.length);
        console.log("[PAYMENT SESSIONS] Providers:", c.payment_collection?.payment_sessions?.map(s => s.provider_id));
    }
    
    const isReadyForPayment = !!c.shipping_methods?.length;
    console.log("[PAYMENT READINESS] isReadyForPayment:", isReadyForPayment);
    if (!isReadyForPayment) {
        console.log("[PAYMENT READINESS] reason: cart.shipping_methods is empty");
    }
  }

  console.log("Setting up base state...");
  await updateAddress("DK", true);
  const opts = await getShippingOptions();
  if (opts.shipping_options?.length > 0) {
      await setShippingMethod(opts.shipping_options[0].id);
  }
  
  // Need to setup payment collection
  const pcRes = await fetch(`${backendUrl}/store/payment-collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ cart_id: cartId })
  });
  const pcData = await pcRes.json();
  const collectionId = pcData.payment_collection.id;
  await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ provider_id: "pp_stripe_stripe" })
  });

  await auditState("TEST A: DK -> DK (Base State)");

  console.log("\n>>> Transitioning DK -> CA");
  await updateAddress("CA", false);
  await auditState("TEST B: DK -> CA (After Address Update)");
  
  // The frontend automatically sets the shipping method if options exist!
  // Let's simulate page.tsx doing this!
  console.log("\n>>> Simulating page.tsx auto-selecting shipping method");
  const caOpts = await getShippingOptions();
  if (caOpts.shipping_options?.length > 0) {
      await setShippingMethod(caOpts.shipping_options[0].id);
  }
  
  await auditState("TEST B2: DK -> CA (After page.tsx auto-selects shipping method)");
}test().catch(console.error);
