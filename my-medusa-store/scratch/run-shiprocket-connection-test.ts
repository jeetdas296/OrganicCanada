require('dotenv').config();

async function runTest() {
  console.log("Loading Shiprocket Adapter...");
  
  // We need to require ts-node or run via npx ts-node to parse typescript.
  // Alternatively, we can just run this script using `npx ts-node`
  
  const { ShiprocketAdapter } = require('../src/modules/fulfillment-pal/providers/organic-canada/adapters/shiprocket/index.ts');
  
  const adapter = new ShiprocketAdapter();
  
  console.log("Adapter initialized. Current status:", adapter.getStatus());
  console.log("Testing connection (this will ping Shiprocket /auth/login with your .env credentials)...");
  
  try {
    const result = await adapter.testConnection();
    console.log("\n=== TEST RESULT ===");
    if (result.status === "CONNECTED") {
      console.log("✅ SUCCESS! Shiprocket authenticated successfully.");
      console.log(result);
    } else {
      console.log("❌ FAILED! Shiprocket rejected the credentials or connection failed.");
      console.log(result);
    }
  } catch (error) {
    console.log("❌ CRITICAL ERROR during test:", error.message);
  }
}

runTest();
