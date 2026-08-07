// src/api/admin/b2b-quotes/[id]/approve/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { price } = req.body as { price?: number }

  const query = req.scope.resolve("query")
  const orderModule = req.scope.resolve(Modules.ORDER)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id },
      fields: ["id", "metadata", "total", "subtotal"],
    })

    const order = orders?.[0]
    if (!order) {
      return res.status(404).json({ message: "Draft Order (Quote) not found" })
    }

    const approvedPrice = price ?? Number(order.total)

    const [updatedOrder] = await orderModule.updateOrders([
      {
        id: order.id,
        metadata: {
          ...(order.metadata || {}),
          quote_status: "approved",
          approved_price: approvedPrice,
          approved_by: (req as any).auth_context?.actor_id || "admin",
          approved_at: new Date().toISOString(),
        },
      },
    ])

    return res.json({
      message: "Quote approved successfully",
      order: updatedOrder,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to approve quote",
      error: error.message,
    })
  }
}