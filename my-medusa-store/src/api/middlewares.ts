import { defineMiddlewares } from "@medusajs/framework/http"
import { MedusaRequest, MedusaResponse, MedusaNextFunction, authenticate } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// --------------------------------------------------------
// 🟢 THE SMART IDENTIFIER
// --------------------------------------------------------
async function getVendorIdForUser(req: MedusaRequest, userId: string): Promise<string | null> {
  const query = req.scope.resolve("query")

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "vendor.*"],
    filters: { id: userId }
  })
  if (users.length > 0 && users[0].vendor?.id) return users[0].vendor.id

  try {
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id"],
      filters: { user_id: userId }
    })
    if (vendors.length > 0 && vendors[0].id) return vendors[0].id
  } catch (e) { }

  return null
}

// --------------------------------------------------------
// 1. THE BLOCKER
// --------------------------------------------------------
// --------------------------------------------------------
// 1. THE BLOCKER (Upgraded to a Soft-Block / Data Masking)
// --------------------------------------------------------
const vendorRouteBlocker = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "GET") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    // 🟢 SOFT BLOCK: We force the database to search for an impossible ID.
    // Medusa will return an empty array [] without crashing the React UI!
    req.query = req.query || {};
    req.query.id = ["blocked-for-vendors"];

    if (!(req as any).filterableFields) {
      (req as any).filterableFields = {};
    }
    (req as any).filterableFields.id = ["blocked-for-vendors"];
  }
  next()
}

// --------------------------------------------------------
// 1.5. THE STRICT BLOCKER (Hard 403 for Vendors)
// --------------------------------------------------------
const vendorStrictBlocker = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)
  if (vendorId) {
    return res.status(403).json({ message: "Forbidden. Vendors cannot access this resource." })
  }
  next()
}

// --------------------------------------------------------
// 2. THE PRODUCT CREATOR
// --------------------------------------------------------
const vendorProductCreate = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "POST") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      const productId = body?.product?.id || body?.products?.[0]?.id

      if (productId) {
        const remoteLink = req.scope.resolve("remoteLink")
        remoteLink.create([{
          "vendor": { vendor_id: vendorId },
          [Modules.PRODUCT]: { product_id: productId },
        }]).catch((err: any) => console.error(`❌ [LINK ERROR]`, err.message))
      }
      return originalJson(body)
    }
  }
  next()
}

// --------------------------------------------------------
// 3. THE PRODUCT FILTER
// --------------------------------------------------------
const vendorProductFilter = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "GET") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    const rawPath = req.originalUrl?.split("?")[0] || ""
    const isListRoute = rawPath === "/admin/products" || rawPath === "/admin/products/"

    if (isListRoute) {
      const query = req.scope.resolve("query")
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"]
      })

      const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)
      const targetIds = vendorProductIds.length > 0 ? vendorProductIds : ["no-products-yet"]

      // 🟢 FIXED JS SYNTAX
      req.query = req.query || {};
      req.query.id = targetIds;

      if (!(req as any).filterableFields) {
        (req as any).filterableFields = {};
      }
      (req as any).filterableFields.id = targetIds;
    }
  }
  next()
}

// --------------------------------------------------------
// 4. THE ORDER FILTER
// --------------------------------------------------------
const vendorOrderFilter = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "GET") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    const rawPath = req.originalUrl?.split("?")[0] || ""
    const isListRoute = rawPath === "/admin/orders" || rawPath === "/admin/orders/"

    if (isListRoute) {
      const query = req.scope.resolve("query")
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"]
      })
      const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)

      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "items.*", "items.product_id"]
      })

      const vendorOrderIds = orders.filter((order: any) => {
        return order.items?.some((item: any) => vendorProductIds.includes(item.product_id))
      }).map((o: any) => o.id)

      const targetIds = vendorOrderIds.length > 0 ? vendorOrderIds : ["no-orders-yet"]

      // 🟢 FIXED JS SYNTAX
      req.query = req.query || {};
      req.query.id = targetIds;

      if (!(req as any).filterableFields) {
        (req as any).filterableFields = {};
      }
      (req as any).filterableFields.id = targetIds;
    }
  }
  next()
}
// 🟢 4. THE B2B STOREFRONT BOUNCER (Switches the catalog for wholesale buyers)
const b2bProductFilter = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  try {
    // 1. Is the customer logged into the storefront?
    const customerId = (req as any).auth_context?.actor_id

    if (!customerId) {
      return next() // Not logged in? Show standard retail products.
    }

    const query = req.scope.resolve("query")

    // 2. Fetch the customer and check which groups they belong to
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "groups.*"],
      filters: { id: customerId }
    })

    const customer = customers[0]

    // Check if they are in the wholesale group you manually created
    const isB2B = customer?.groups?.some((g: any) =>
      g.name.toLowerCase().includes("b2b") || g.name.toLowerCase().includes("wholesale")
    )

    if (isB2B) {
      console.log(`🏢 [B2B BOUNCER] Wholesale buyer detected (${customerId}). Morphing catalog...`)

      // 3. Look up the ID of the B2B Sales Channel you just made in the UI
      const { data: channels } = await query.graph({
        entity: "sales_channel",
        fields: ["id"],
        filters: { name: "B2B Wholesale" } // ⚠️ Change this if you named your channel something else!
      })

      const b2bChannelId = channels[0]?.id

      // 4. Force the database to only return products from the B2B Channel!
      if (b2bChannelId) {
        req.query = req.query || {}
        req.query.sales_channel_id = [b2bChannelId]

        if (!(req as any).filterableFields) {
          (req as any).filterableFields = {}
        }
        (req as any).filterableFields.sales_channel_id = [b2bChannelId]

        console.log(`✅ [B2B BOUNCER] Successfully locked catalog to B2B Channel: ${b2bChannelId}`)
      }
    }

    next()
  } catch (error: any) {
    console.error("🛑 Middleware B2B Error:", error.message)
    next()
  }
}

// 🟢 5. THE B2B CART INTERCEPTOR (Checks spending limits)
const b2bCartInterceptor = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  try {
    const cartId = req.params.id
    if (!cartId) return next()

    const query = req.scope.resolve("query")
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "customer.metadata", "customer.id"],
      filters: { id: cartId }
    })

    const cart = carts[0]
    if (!cart || !cart.customer) return next()

    const spendingLimit = cart.customer.metadata?.spending_limit

    if (spendingLimit !== undefined && spendingLimit !== null) {
      if ((cart as any).total > spendingLimit) {
        return res.status(400).json({
          type: "invalid_data",
          message: `B2B Spending Limit Exceeded. Your limit is ${spendingLimit}, but the cart total is ${(cart as any).total}.`
        })
      }
    }

    next()
  } catch (error: any) {
    console.error("🛑 Cart Interceptor Error:", error.message)
    next()
  }
}

// 🛑 THE APPROVAL BOUNCER (Updated for is_active boolean)
// --------------------------------------------------------
const vendorApprovalBouncer = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  // Allow the actual login requests to pass through
  if (req.path.includes("/admin/auth")) return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const query = req.scope.resolve("query")

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "vendor.*"],
    filters: { id: userId }
  })

  const vendor = users[0]?.vendor

  if (vendor) {
    // 🟢 We now check your specific database column: is_active
    // If it is strictly false, we kick them out.
    if (vendor.is_active === false) {
      console.log(`🛑 [BOUNCER] Kicked out pending vendor: ${vendor.id}`)

      return res.status(401).json({
        message: "Your vendor account is still pending approval by the Super Admin."
      })
    }
  }

  next() // They are Super Admin OR an Active Vendor, let them in!
}
// --------------------------------------------------------
// THE INVENTORY FILTER
// --------------------------------------------------------
const vendorInventoryFilter = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "GET") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    const rawPath = req.originalUrl?.split("?")[0] || ""
    const isListRoute = rawPath === "/admin/inventory-items" || rawPath === "/admin/inventory-items/"

    if (isListRoute) {
      const query = req.scope.resolve("query")

      // 1. Fetch all products with their variants and linked inventory items
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*", "variants.*", "variants.inventory_items.*"]
      })

      // 2. Filter for this vendor's products
      const vendorProducts = products.filter((p: any) => p.vendor?.id === vendorId)

      // 3. Extract the exact Inventory Item IDs linked to this vendor's products
      let inventoryIds: string[] = []
      vendorProducts.forEach((p: any) => {
        p.variants?.forEach((v: any) => {
          v.inventory_items?.forEach((ii: any) => {
            if (ii.inventory_item_id) inventoryIds.push(ii.inventory_item_id)
            else if (ii.id) inventoryIds.push(ii.id)
          })
        })
      })

      const targetIds = inventoryIds.length > 0 ? inventoryIds : ["no-inventory-yet"]

      // 4. Force the database to only return these specific inventory items
      req.query = req.query || {};
      req.query.id = targetIds;

      if (!(req as any).filterableFields) {
        (req as any).filterableFields = {};
      }
      (req as any).filterableFields.id = targetIds;
    }
  }
  next()
}

// --------------------------------------------------------
// THE DRAFT ORDER FILTER
// --------------------------------------------------------
const vendorDraftOrderFilter = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  if (req.method !== "GET") return next()

  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()

  const vendorId = await getVendorIdForUser(req, userId)

  if (vendorId) {
    const rawPath = req.originalUrl?.split("?")[0] || ""
    const isListRoute = rawPath === "/admin/draft-orders" || rawPath === "/admin/draft-orders/"

    if (isListRoute) {
      const query = req.scope.resolve("query")

      // 1. Find all products owned by this vendor
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"]
      })
      const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id)

      // 2. Query orders (Draft Orders are stored as regular orders with an is_draft_order flag)
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "items.*", "items.product_id"]
      })

      // 3. Filter orders that contain the vendor's products
      const vendorDraftOrderIds = orders.filter((order: any) => {
        return order.items?.some((item: any) => vendorProductIds.includes(item.product_id))
      }).map((o: any) => o.id)

      const targetIds = vendorDraftOrderIds.length > 0 ? vendorDraftOrderIds : ["no-draft-orders-yet"]

      // 4. Force the database to only return these specific draft orders
      req.query = req.query || {};
      req.query.id = targetIds;

      if (!(req as any).filterableFields) {
        (req as any).filterableFields = {};
      }
      (req as any).filterableFields.id = targetIds;
    }
  }
  next()
}
// ════════════════════════════════════════════════════════════════
// ADD THESE 2 FUNCTIONS to middlewares.ts
// Paste them ABOVE the "export default defineMiddlewares" block
// ════════════════════════════════════════════════════════════════

// 🟢 OMS: VENDOR RETURN FILTER
// Shows vendors only their own order returns
const vendorReturnFilter = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (req.method !== "GET") return next()
  const userId = (req as any).auth_context?.actor_id
  if (!userId) return next()
  const vendorId = await getVendorIdForUser(req, userId)
  if (vendorId) {
    const rawPath = req.originalUrl?.split("?")[0] || ""
    const isListRoute =
      rawPath === "/admin/returns" || rawPath === "/admin/returns/"
    if (isListRoute) {
      const query = req.scope.resolve("query")
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.*"],
      })
      const vendorProductIds = products
        .filter((p: any) => p.vendor?.id === vendorId)
        .map((p: any) => p.id)
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "items.*", "items.product_id"],
      })
      const vendorOrderIds = orders
        .filter((o: any) =>
          o.items?.some((item: any) =>
            vendorProductIds.includes(item.product_id)
          )
        )
        .map((o: any) => o.id)
      const targetIds =
        vendorOrderIds.length > 0 ? vendorOrderIds : ["no-returns-yet"]
      req.query = req.query || {}
      req.query.order_id = targetIds
      if (!(req as any).filterableFields) (req as any).filterableFields = {}
        ; (req as any).filterableFields.order_id = targetIds
    }
  }
  next()
}

// 🟢 OMNICHANNEL: POS CHANNEL FILTER
// When ?channel=pos is passed, restricts catalog to POS sales channel
const posChannelFilter = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (req.method !== "GET") return next()
  const rawPath = req.originalUrl?.split("?")[0] || ""
  const isPosRoute =
    rawPath.startsWith("/store/products") && req.query.channel === "pos"
  if (isPosRoute) {
    const query = req.scope.resolve("query")
    const { data: channels } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
      filters: { name: "POS" }, // Change if you named your POS channel differently
    })
    const posChannelId = channels[0]?.id
    if (posChannelId) {
      req.query.sales_channel_id = [posChannelId]
      if (!(req as any).filterableFields) (req as any).filterableFields = {}
        ; (req as any).filterableFields.sales_channel_id = [posChannelId]
    }
  }
  next()
}


// 🟢 POS AUTH BOUNCER
// Protects all /store/pos routes except /store/pos/auth
import { verifyToken } from "../modules/pos/utils/auth"

function getCookie(name: string, cookiesHeader: string | undefined): string | null {
  if (!cookiesHeader) return null
  const match = cookiesHeader.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
  return null
}

const posAuthBouncer = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  console.log("🛡️ [posAuthBouncer] Intercepted path:", req.originalUrl)

  // Allow auth endpoints to pass
  if (req.originalUrl.includes("/store/pos/auth")) {
    console.log("🛡️ [posAuthBouncer] Allowing auth route to pass.")
    return next()
  }

  const token = getCookie("pos_token", req.headers.cookie) || req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Set the decoded POS user in request for later use if needed
  (req as any).pos_user = decoded

  next()
}


// --------------------------------------------------------
// SECURITY HEADERS & RATE LIMITING
// --------------------------------------------------------
const securityHeaders = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  
  if (process.env.NODE_ENV === "development") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:*; img-src 'self' data: blob:;"
    )
  } else {
    res.setHeader("Content-Security-Policy", "default-src 'self'")
  }
  
  next()
}

const rateLimits = new Map<string, { count: number, resetTime: number }>()

const rateLimiter = (max: number, windowMs: number) => {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    // Note: socket can be undefined, hence any type assertion
    const ip = req.headers['x-forwarded-for'] || (req.socket as any)?.remoteAddress || "unknown"
    const key = `${req.path}-${ip}`
    const now = Date.now()
    
    let record = rateLimits.get(key)
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs }
    } else {
      record.count++
    }
    
    rateLimits.set(key, record)
    
    // Cleanup old keys occasionally
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimits.entries()) {
        if (now > v.resetTime) rateLimits.delete(k)
      }
    }
    
    if (record.count > max) {
      return res.status(429).json({ message: "Too many requests. Please try again later." })
    }
    next()
  }
}

const loginLimiter = rateLimiter(20, 60 * 1000) // 20 per min

const passwordResetLimiter = rateLimiter(3, 60 * 60 * 1000) // 3 per hour

export default defineMiddlewares({
  errorHandler: (error: any, req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const correlationId = req.headers['x-request-id'] || Math.random().toString(36).substring(7)
    console.error(`[ERROR ID: ${correlationId}]`, error)
    
    res.status(500).json({
      message: "An internal server error occurred. Please try again later.",
      correlation_id: correlationId
    })
  },
  routes: [
    {
      matcher: "/*",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/auth/*",
      method: "POST",
      middlewares: [loginLimiter],
    },
    {
      matcher: "/store/pos/auth/login",
      method: "POST",
      middlewares: [loginLimiter],
    },
    {
      matcher: "/auth/customer/emailpass/reset-password",
      method: "POST",
      middlewares: [passwordResetLimiter],
    },
    {
      matcher: "/admin/*",
      middlewares: [vendorApprovalBouncer],
    },
    {
      matcher: "/store/products",
      method: "GET",
      middlewares: [b2bProductFilter],
    },
    {
      matcher: "/store/b2b-quotes/:id/negotiation",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/carts/:id/complete",
      method: "POST",
      middlewares: [b2bCartInterceptor],
    },

    // 🔴 THE NEW ROUTE BLOCKERS (Secures the backend APIs)
    { matcher: "/admin/b2b-quotes/:id/negotiation", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/b2b-quotes/:id/proposal", middlewares: [vendorRouteBlocker] },
    
    { matcher: "/admin/customers", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/customers/*", middlewares: [vendorRouteBlocker] },

    { matcher: "/admin/price-lists", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/price-lists/*", middlewares: [vendorRouteBlocker] },

    { matcher: "/admin/vendor-approvals", middlewares: [vendorRouteBlocker] },

    { matcher: "/admin/settings", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/settings/*", middlewares: [vendorRouteBlocker] },

    // Strict block vendors from POS users
    { matcher: "/admin/pos-users", middlewares: [vendorStrictBlocker] },
    { matcher: "/admin/pos-users/*", middlewares: [vendorStrictBlocker] },

    // Vendor allowances
    { matcher: "/admin/products", middlewares: [vendorProductFilter, vendorProductCreate] },
    { matcher: "/admin/products/*", middlewares: [vendorProductFilter] },
    { matcher: "/admin/orders", middlewares: [vendorOrderFilter] },
    { matcher: "/admin/orders/*", middlewares: [vendorOrderFilter] },
    { matcher: "/admin/inventory-items", middlewares: [vendorInventoryFilter] },
    { matcher: "/admin/inventory-items/*", middlewares: [vendorInventoryFilter] },

    { matcher: "/admin/draft-orders", middlewares: [vendorDraftOrderFilter] },
    { matcher: "/admin/draft-orders/*", middlewares: [vendorDraftOrderFilter] },
    { matcher: "/admin/returns", middlewares: [vendorReturnFilter] },
    { matcher: "/admin/returns/*", middlewares: [vendorReturnFilter] },

    {
      matcher: "/admin/vendor-commission",
      middlewares: [vendorRouteBlocker],
    },
    {
      matcher: "/admin/vendor-commission/*",
      middlewares: [vendorRouteBlocker],
    },
    {
      matcher: "/store/products",
      method: "GET",
      middlewares: [posChannelFilter],
    },
    {
      matcher: "/store/pos",
      middlewares: [posAuthBouncer],
    },
    {
      matcher: "/store/pos/*",
      middlewares: [posAuthBouncer],
    },
  ],
})