async function runB2BTest() {
  console.log("1️⃣ Logging in as B2B Buyer...");
  
  // Step 1: Simulate the login
  const loginRes = await fetch("http://localhost:9000/auth/customer/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email: "buyer@restaurant.com", 
      password: "password123" // <-- Change this to your test password!
    })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.token; 

  if (!token) {
    return console.log("❌ Login failed! Check your email/password.", loginData);
  }
  console.log("✅ Login successful! Token received.");

  console.log("\n2️⃣ Fetching Storefront Products...");
  
  const productRes = await fetch("http://localhost:9000/store/products", {
    method: "GET",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-publishable-api-key": "pk_1ef2d0f9f81b37e3a6a798a48dfb087669574e6a98dad2d8b6ebe770eb0c671f" // 🟢 Added the API Key!
    }
  });

  const productData = await productRes.json();

  // 🟢 NEW ERROR CHECK: Print exactly why Medusa is mad!
  if (!productRes.ok) {
    console.log("❌ MEDUSA ERROR:");
    console.log(JSON.stringify(productData, null, 2));
    return; // Stop the script here
  }

  console.log("\n📦 Products visible to this B2B Buyer:");
  if (productData.products && productData.products.length > 0) {
    productData.products.forEach(p => console.log(`- ${p.title}`));
  } else {
    console.log("- No products found (Check if your B2B channel has products!)");
  }
}

runB2BTest();