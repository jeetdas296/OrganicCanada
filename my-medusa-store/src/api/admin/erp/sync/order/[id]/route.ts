import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /admin/erp/sync/order/:id
 * Manually syncs an order to ERPNext.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const erpModuleService = req.scope.resolve("erp")
  const query = req.scope.resolve("query")
  const userId = (req as any).auth_context?.actor_id

  try {
    // Security: Block unauthenticated and vendor requests from triggering ERP syncs
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }
    if (userId) {
      const { data: users } = await query.graph({
        entity: "user",
        fields: ["id", "vendor.id"],
        filters: { id: userId }
      })
      if (users[0]?.vendor?.id) {
        return res.status(403).json({ message: "Forbidden. Vendors cannot access ERP functions." })
      }
    }

    // Fetch order details
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "email",
        "payment_status",
        "items.variant_id",
        "items.quantity",
        "items.unit_price",
        "items.variant.sku",
        "items.variant.title",
        "items.variant.product.title",
        "items.variant.product.description",
      ],
      filters: { id },
    })

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." })
    }

    // Fetch customer details if logged in
    let customerDetails: {
      email: string
      first_name: string
      last_name: string
      phone?: string
    } = {
      email: String(order.email ?? ""),
      first_name: "Guest",
      last_name: "Customer",
      phone: undefined,
    }

    if (order.customer_id) {
      const { data: [customer] } = await query.graph({
        entity: "customer",
        fields: ["email", "first_name", "last_name", "phone"],
        filters: { id: order.customer_id },
      })
      if (customer) {
        customerDetails = {
          email: String(customer.email ?? order.email ?? ""),
          first_name: customer.first_name || "Guest",
          last_name: customer.last_name || "Customer",
          phone: customer.phone || undefined,
        }
      }
    }
    const erpName = await erpModuleService.syncOrder(
      order as {
        id: string
        customer_id?: string | null
        email: string
        payment_status?: string
        items: Array<{
          variant_id: string
          quantity: number
          unit_price: number
          variant?: {
            sku?: string
            title: string
            product?: {
              title: string
              description?: string
            }
          }
        }>
      },
      customerDetails
    )
    return res.status(200).json({ success: true, erp_name: erpName })
  } catch (error: any) {
    console.error("[ERP SYNC ORDER] Error:", error.message)
    return res.status(500).json({ success: false, error: "Failed to sync order to ERP" })
  }
}
