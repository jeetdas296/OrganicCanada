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
          country_code: countryCode.toLowerCase() // fix it in test too!
        }
      })
    });
    if (!res.ok) {
        console.log(`Failed to update to ${countryCode}:`, res.status, await res.text());
        return;
    }
    return await res.json();
  }

  async function getCart() {
    const res = await fetch(`${backendUrl}/store/carts/${cartId}?fields=*shipping_address,*shipping_methods`, {
      headers: { "Content-Type": "application/json", "x-publishable-api-key": pubKey },
    });
    return await res.json();
  }

  // 1. Initial Address -> DK (Domestic)
  console.log("\n--- Transition 1: Initial Address -> DK ---");
  await updateAddress("DK", true);
  let cartData = await getCart();
  console.log("Cart Country Code:", cartData.cart.shipping_address?.country_code);

  // 2. Transition -> CA (Cross Border)
  console.log("\n--- Transition 2: DK -> CA ---");
  await updateAddress("CA", false);
  cartData = await getCart();
  console.log("Cart Country Code:", cartData.cart.shipping_address?.country_code);

  // 3. Transition -> DK (Back to Domestic)
  console.log("\n--- Transition 3: CA -> DK ---");
  await updateAddress("DK", true);
  cartData = await getCart();
  console.log("Cart Country Code:", cartData.cart.shipping_address?.country_code);

  // 4. Transition -> CA -> IN (Cross Border -> Unconfigured Country)
  console.log("\n--- Transition 4: DK -> CA -> IN ---");
  await updateAddress("CA", false); // back to CA
  await updateAddress("IN", false); // then to IN
  cartData = await getCart();
  console.log("Cart Country Code:", cartData.cart.shipping_address?.country_code);
}test().catch(console.error);
