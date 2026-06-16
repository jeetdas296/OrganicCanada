export default async function seedOmnichannel({ container }: any) {
  console.log("🌱 [SEED] Starting Omnichannel seed for European region...")

  try {
    // ✅ FIX: Use the correct module resolution pattern for Medusa v2
    const { Modules } = await import("@medusajs/framework/utils")
    
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
    const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)
    const remoteLink = container.resolve("remoteLink")

    // ──────────────────────────────────────────────────────────────
    // 1. Create POS Sales Channel
    // ──────────────────────────────────────────────────────────────
    let posChannel: any
    try {
      const existingChannels = await salesChannelModuleService.listSalesChannels({
        name: ["POS"],
      })
      
      if (existingChannels.length > 0) {
        posChannel = existingChannels[0]
        console.log("ℹ️  [SEED] POS Sales Channel already exists: " + posChannel.id)
      } else {
        const newChannels = await salesChannelModuleService.createSalesChannels([
          {
            name: "POS",
            description: "In-store Point of Sale for European locations",
            is_disabled: false,
          },
        ])
        posChannel = newChannels[0]
        console.log("✅ [SEED] Created POS Sales Channel: " + posChannel.id)
      }
    } catch (err: any) {
      console.error("❌ [SEED] Failed to create POS channel:", err.message)
      return
    }

    // ──────────────────────────────────────────────────────────────
    // 2. Check if European Warehouse already exists
    // ──────────────────────────────────────────────────────────────
    let warehouse: any
    try {
      const existingLocations = await stockLocationModuleService.listStockLocations({
        name: ["European Warehouse"],
      })
      
      if (existingLocations.length > 0) {
        warehouse = existingLocations[0]
        console.log("ℹ️  [SEED] European Warehouse already exists: " + warehouse.id)
      } else {
        console.log("⚠️  [SEED] European Warehouse not found, skipping creation (should already exist)")
      }
    } catch (err: any) {
      console.error("⚠️  [SEED] Warehouse lookup error:", err.message)
    }

    // ──────────────────────────────────────────────────────────────
    // 3. Create Physical Store (Pickup Location) — Copenhagen
    // ──────────────────────────────────────────────────────────────
    let store: any
    try {
      // Check if it already exists
      const existingStores = await stockLocationModuleService.listStockLocations({
        name: ["Copenhagen Flagship Store"],
      })
      
      if (existingStores.length > 0) {
        store = existingStores[0]
        console.log("ℹ️  [SEED] Copenhagen Flagship Store already exists: " + store.id)
      } else {
        const newStores = await stockLocationModuleService.createStockLocations([
          {
            name: "Copenhagen Flagship Store",
            address: {
              address_1: "Strøget 123",
              city: "Copenhagen",
              province: "Capital Region",
              country_code: "DK",
              postal_code: "1150",
            },
          },
        ])
        store = newStores[0]
        console.log("✅ [SEED] Created Physical Store: " + store.id)
      }
    } catch (err: any) {
      console.error("❌ [SEED] Failed to create store:", err.message)
      return
    }

    // ──────────────────────────────────────────────────────────────
    // 4. Link POS Sales Channel → Physical Store Location
    // ──────────────────────────────────────────────────────────────
    if (posChannel?.id && store?.id) {
      try {
        await remoteLink.create([
          {
            [Modules.SALES_CHANNEL]: {
              sales_channel_id: posChannel.id,
            },
            [Modules.STOCK_LOCATION]: {
              stock_location_id: store.id,
            },
          },
        ])
        console.log("🔗 [SEED] Linked POS Channel → Store successfully")
      } catch (err: any) {
        // Link might already exist, that's okay
        if (err.message?.includes("already exists") || err.message?.includes("duplicate")) {
          console.log("ℹ️  [SEED] Link already exists between POS Channel and Store")
        } else {
          console.error("⚠️  [SEED] Failed to link channel → location:", err.message)
        }
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 5. Summary
    // ──────────────────────────────────────────────────────────────
    console.log("\n🎉 [SEED] Omnichannel seed complete!")
    console.log("─────────────────────────────────────────")
    console.log("Seeded Resources:")
    console.log(`  🏪 POS Sales Channel ID:   ${posChannel?.id || "FAILED"}`)
    console.log(`  🏭 Warehouse Location ID:  ${warehouse?.id || "N/A (already exists)"}`)
    console.log(`  📍 Pickup Store ID:        ${store?.id || "FAILED"}`)
    console.log("\n📋 Next Steps:")
    console.log("  1. Go to Admin → Products → assign all products to POS channel")
    console.log("  2. Go to Admin → Locations → Copenhagen Store → Enable Pickup")
    console.log("  3. Go to Admin → Inventory → add stock at Copenhagen Store")
    console.log("  4. Test: POST /store/pos/orders with EUR currency")
    console.log("  5. Test: GET /store/pickup/locations")
    console.log("─────────────────────────────────────────\n")

  } catch (err: any) {
    console.error("💥 [SEED] Fatal error:", err.message)
    console.error(err.stack)
  }
}