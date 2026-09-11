import fs from "fs";

const backendUrl = "http://localhost:9000";
const pubKey = "pk_1ef2d0f9f81b37e3a6a798a48dfb087669574e6a98dad2d8b6ebe770eb0c671f";

async function runAudit() {
  console.log("Creating cart...");
  let res = await fetch(`${backendUrl}/store/carts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({
      region_id: "reg_01KHBQ853M2Y917XTHGND9CS27", // Europe
    })
  });
  if (!res.ok) {
    console.log("Failed to create cart", res.status, await res.text());
    return;
  }
  let data = await res.json();
  const cartId = data.cart.id;
  console.log("Cart created:", cartId);

  // Add item
  await fetch(`${backendUrl}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    body: JSON.stringify({ variant_id: "variant_01KMT8H7ATW7Z91P44RWWD92RK", quantity: 1 })
  });

  async function getCart() {
    const r = await fetch(`${backendUrl}/store/carts/${cartId}?fields=*shipping_address,*shipping_methods,*payment_collection,*payment_collection.payment_sessions,*items,*promotions`, {
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    });
    return (await r.json()).cart;
  }

  async function updateAddress(countryCode, isDomestic) {
    const endpoint = isDomestic 
      ? `${backendUrl}/store/carts/${cartId}`
      : `${backendUrl}/store/custom-carts/${cartId}/shipping-address`;

    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({
        shipping_address: {
          first_name: "Test", last_name: "User", address_1: "123 Main St",
          city: "Testville", postal_code: "1000", country_code: countryCode.toLowerCase()
        }
      })
    });
  }

  async function getShippingOptions() {
    const r = await fetch(`${backendUrl}/store/shipping-options?cart_id=${cartId}`, {
      headers: { "x-publishable-api-key": pubKey }
    });
    return (await r.json()).shipping_options;
  }

  async function setShippingMethod(optionId) {
    await fetch(`${backendUrl}/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ option_id: optionId })
    });
  }

  async function createPaymentCollection() {
    const r = await fetch(`${backendUrl}/store/payment-collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ cart_id: cartId })
    });
    return (await r.json()).payment_collection;
  }

  async function addPaymentSession(collectionId, providerId) {
    const r = await fetch(`${backendUrl}/store/payment-collections/${collectionId}/payment-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
      body: JSON.stringify({ provider_id: providerId })
    });
    if (!r.ok) {
        console.log("Failed to add payment session", r.status, await r.text());
        return null;
    }
    return await r.json();
  }

  function printCartState(cart, name) {
    console.log(`\n=================== CART STATE: ${name} ===================`);
    console.log(JSON.stringify({
      id: cart.id,
      region_id: cart.region_id,
      currency_code: cart.currency_code,
      sales_channel_id: cart.sales_channel_id,
      shipping_address: { country_code: cart.shipping_address?.country_code },
      shipping_methods: cart.shipping_methods?.map(sm => ({ shipping_option_id: sm.shipping_option_id })),
      subtotal: cart.subtotal,
      shipping_subtotal: cart.shipping_subtotal,
      shipping_total: cart.shipping_total,
      tax_total: cart.tax_total,
      total: cart.total,
      payment_collection_id: cart.payment_collection?.id,
      payment_collection: cart.payment_collection ? {
          id: cart.payment_collection.id,
          payment_sessions: cart.payment_collection.payment_sessions?.map(ps => ({
              provider_id: ps.provider_id,
              status: ps.status
          }))
      } : null
    }, null, 2));
  }

  // --- BASE STATE DK ---
  await updateAddress("DK", true);
  let opts = await getShippingOptions();
  await setShippingMethod(opts[0].id);
  let pc = await createPaymentCollection();
  await addPaymentSession(pc.id, "pp_stripe_stripe");

  let cart = await getCart();
  printCartState(cart, "WORKING: DK -> DK");

  // --- TRANSITION CA ---
  await updateAddress("CA", false);
  cart = await getCart();
  printCartState(cart, "BROKEN: DK -> CA (Before Shipping Method Update)");

  // --- SET SHIPPING METHOD FOR CA ---
  opts = await getShippingOptions();
  await setShippingMethod(opts[0].id);
  cart = await getCart();
  printCartState(cart, "BROKEN: DK -> CA (After Shipping Method Update)");

  // --- TEST SETTING PAYMENT SESSION ---
  console.log("\nTesting setPaymentSessionAction (Stripe)...");
  await addPaymentSession(cart.payment_collection.id, "pp_stripe_stripe");
  cart = await getCart();
  console.log("Sessions after Stripe:", JSON.stringify(cart.payment_collection?.payment_sessions?.map(s => ({provider: s.provider_id, status: s.status}))));

  console.log("\nTesting setPaymentSessionAction (PayPal)...");
  await addPaymentSession(cart.payment_collection.id, "pp_paypal_paypal");
  cart = await getCart();
  console.log("Sessions after PayPal:", JSON.stringify(cart.payment_collection?.payment_sessions?.map(s => ({provider: s.provider_id, status: s.status}))));
}

runAudit().catch(console.error);
