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
    // Security: Block vendors from triggering ERP syncs
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
    let customerDetails = {
      email: order.email,
      first_name: "Guest",
      last_name: "Customer",
      phone: undefined as string | undefined,
    }

    if (order.customer_id) {
      const { data: [customer] } = await query.graph({
        entity: "customer",
        fields: ["email", "first_name", "last_name", "phone"],
        filters: { id: order.customer_id },
      })
      if (customer) {
        customerDetails = {
          email: customer.email,
          first_name: customer.first_name || "Guest",
          last_name: customer.last_name || "Customer",
          phone: customer.phone || undefined,
        }
      }
    }

    const erpName = await erpModuleService.syncOrder(order, customerDetails)
    return res.status(200).json({ success: true, erp_name: erpName })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
