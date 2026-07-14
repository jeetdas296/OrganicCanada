import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getInventorySummaryWorkflow,
  transferStockWorkflow,
} from "../../../workflows/inventory-location"

// ─── GET /admin/inventory-locations ──────────────────────────────
// Returns all stock locations with inventory level summaries
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve("query")

    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "address.*", "metadata", "sales_channels.*"],
    })

    const { result } = await getInventorySummaryWorkflow(req.scope).run({
      input: { location_ids: locations.map((l: any) => l.id) },
    })

    const summary = locations.map((loc: any) => {
      const locationLevels = (result.levels as any[]).filter(
        (lvl: any) => lvl.location_id === loc.id
      )
      const totalStock = locationLevels.reduce(
        (sum: number, lvl: any) => sum + (lvl.stocked_quantity || 0),
        0
      )
      const totalReserved = locationLevels.reduce(
        (sum: number, lvl: any) => sum + (lvl.reserved_quantity || 0),
        0
      )

      return {
        id: loc.id,
        name: loc.name,
        is_pickup: loc.metadata?.is_pickup === "true" || loc.metadata?.is_pickup === true,
        is_warehouse: loc.metadata?.is_warehouse === "true" || loc.metadata?.is_warehouse === true,
        address: loc.address,
        sales_channels: loc.sales_channels?.map((sc: any) => sc.name) || [],
        inventory_summary: {
          total_stocked: totalStock,
          total_reserved: totalReserved,
          total_available: totalStock - totalReserved,
          sku_count: locationLevels.length,
        },
      }
    })

    return res.json({ inventory_locations: summary })
  } catch (err: any) {
    console.error("[INV-LOC] GET error:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// ─── POST /admin/inventory-locations ────────────────────────────
// Used for stock transfers between locations (warehouse → store)
// Body: { inventory_item_id, from_location_id, to_location_id, quantity }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { inventory_item_id, from_location_id, to_location_id, quantity } =
    req.body as any

  if (!inventory_item_id || !from_location_id || !to_location_id || !quantity) {
    return res.status(400).json({
      error:
        "inventory_item_id, from_location_id, to_location_id, quantity are all required",
    })
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: "quantity must be greater than 0" })
  }

  try {
    const { result } = await transferStockWorkflow(req.scope).run({
      input: { inventory_item_id, from_location_id, to_location_id, quantity },
    })

    return res.json({
      message: "Stock transferred successfully",
      transfer: result,
    })
  } catch (err: any) {
    console.error("[INV-LOC] POST error:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}