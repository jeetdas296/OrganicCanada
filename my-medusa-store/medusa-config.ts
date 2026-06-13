import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS! || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS! || "http://localhost:8000,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    // 💳 1. The Payment Module
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
          {
            resolve: "./src/modules/paypal",
            id: "paypal",
          },
        ],
      },
    },
    // 🏢 2. The Custom Company Module (B2B)
    {
      resolve: "./src/modules/company",
      options: {},
    },
    // 📦 3. The Custom Subscription Module
    {
      resolve: "./src/modules/subscription",
      options: {},
    },
    // 🚜 4. The Custom Marketplace Vendor Module
    {
      resolve: "./src/modules/vendor",
      options: {},
    },
    {
      resolve: "./src/modules/digital-asset",
    },
    // 📦 5. The Custom Bundle Module (Bundled Products)
    {
      resolve: "./src/modules/bundle",
    },
  ],
})