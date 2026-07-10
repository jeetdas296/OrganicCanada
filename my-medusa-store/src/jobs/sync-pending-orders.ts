import type { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function syncPendingOrdersJob(
  container: MedusaContainer
) {
  console.log("[OMS-JOB] Running pending order sync...")

  const query = container.resolve("query")
  const orderService = container.resolve(Modules.ORDER)

  // Cutoff: 24 hours ago
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { data: allDrafts } = await query.graph({
    entity: "order",
    fields: ["id", "status", "created_at", "customer_id", "total"],
    filters: { status: "draft" },
  })

  // Filter stale orders in JS (graph filters don't support date comparison)
  const staleOrders = allDrafts.filter(
    (o: any) => new Date(o.created_at) < cutoff
  )

  console.log("[OMS-JOB] Found " + staleOrders.length + " stale draft orders")

  for (const order of staleOrders) {
    try {
      await (orderService as any).cancelOrder(order.id)
      console.log("[OMS-JOB] Auto-cancelled stale draft: " + order.id)
    } catch (err: any) {
      console.warn("[OMS-JOB] Could not cancel " + order.id + ": " + err.message)
    }
  }

  console.log("[OMS-JOB] Sync complete.")
}

// Runs every hour at :00
export const config = {
  name: "sync-pending-orders",
  schedule: "0 * * * *",
}