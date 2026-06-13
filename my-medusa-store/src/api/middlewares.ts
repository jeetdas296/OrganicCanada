import { defineMiddlewares } from "@medusajs/framework/http"
import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
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
  } catch (e) {}

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
      if (cart.total > spendingLimit) {
        return res.status(400).json({
          type: "invalid_data",
          message: `B2B Spending Limit Exceeded. Your limit is ${spendingLimit}, but the cart total is ${cart.total}.`
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

export default defineMiddlewares({
  routes: [
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
      matcher: "/store/carts/:id/complete",
      method: "POST",
      middlewares: [b2bCartInterceptor],
    },
    
    // 🔴 THE NEW ROUTE BLOCKERS (Secures the backend APIs)
    { matcher: "/admin/customers", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/customers/*", middlewares: [vendorRouteBlocker] },
    
    { matcher: "/admin/price-lists", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/price-lists/*", middlewares: [vendorRouteBlocker] },
    
    { matcher: "/admin/b2b-quotes", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/vendor-approvals", middlewares: [vendorRouteBlocker] },
    
    { matcher: "/admin/settings", middlewares: [vendorRouteBlocker] },
    { matcher: "/admin/settings/*", middlewares: [vendorRouteBlocker] },
    
    // Vendor allowances
    { matcher: "/admin/products", middlewares: [vendorProductFilter, vendorProductCreate] },
    { matcher: "/admin/products/*", middlewares: [vendorProductFilter] },
    { matcher: "/admin/orders", middlewares: [vendorOrderFilter] },
    { matcher: "/admin/orders/*", middlewares: [vendorOrderFilter] },
    { matcher: "/admin/inventory-items", middlewares: [vendorInventoryFilter] },
    { matcher: "/admin/inventory-items/*", middlewares: [vendorInventoryFilter] },
    
    { matcher: "/admin/draft-orders", middlewares: [vendorDraftOrderFilter] },
    { matcher: "/admin/draft-orders/*", middlewares: [vendorDraftOrderFilter] }
  ],
})