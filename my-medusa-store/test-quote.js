const API_KEY = "pk_1ef2d0f9f81b37e3a6a798a48dfb087669574e6a98dad2d8b6ebe770eb0c671f";
const SALES_CHANNEL_ID = "sc_01KSZFVVRSN9M3XR61MK6E50XD"; // 🟢 Paste your Publishable API Key here!
const BASE_URL = "http://localhost:9000";
const EMAIL = "buyer@restaurant.com";
const PASSWORD = "password123";

async function runQuoteTest() {
    console.log("1️⃣ Logging in as B2B Buyer...");

    const loginRes = await fetch(`${BASE_URL}/auth/customer/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;

    if (!token) {
        return console.log("❌ Login failed. Check credentials.");
    }
    console.log("✅ Logged in successfully!");

    console.log("\n2️⃣ Fetching Store Regions (Required to create a cart)...");
    const regionRes = await fetch(`${BASE_URL}/store/regions`, {
        headers: { "x-publishable-api-key": API_KEY }
    });
    const regionData = await regionRes.json();
    const regionId = regionData.regions[0]?.id;

    if (!regionId) {
        return console.log("❌ No regions found in your store! Please create a region in the Admin UI.");
    }

    console.log("\n3️⃣ Creating a new Shopping Cart...");
    const cartRes = await fetch(`${BASE_URL}/store/carts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": API_KEY,
            "Authorization": `Bearer ${token}`
        },
        // 🟢 We now explicitly pass the sales_channel_id so Medusa knows where to put the cart!
        body: JSON.stringify({
            region_id: regionId,
            sales_channel_id: SALES_CHANNEL_ID
        })
    });

    const cartData = await cartRes.json();
    const cartId = cartData.cart?.id;

    if (!cartId) {
        return console.log("❌ Failed to create cart. (Data redacted)");
    }
    console.log(`✅ Cart created! ID: ${cartId}`);

    console.log("\n4️⃣ Submitting Cart to the custom B2B Quotes API...");
    // 🟢 This is where we hit the exact route your AI just built!
    const quoteRes = await fetch(`${BASE_URL}/store/b2b-quotes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": API_KEY,
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ cart_id: cartId })
    });

    const quoteData = await quoteRes.json();

    if (!quoteRes.ok) {
        console.log("❌ The B2B Quotes API returned an error:");
        console.log(JSON.stringify(quoteData, null, 2));
    } else {
        console.log("🎉 SUCCESS! The cart was converted into a Draft Order (Quote).");
        console.log("Response from server:", JSON.stringify(quoteData, null, 2));
    }
}

runQuoteTest();