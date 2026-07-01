import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function erpPaymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const erpModuleService = container.resolve("erp")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  logger.info(`[ERPNext Subscriber] Payment captured detected: ${data.id}. Fetching order details...`)
  
  try {
    // Resolve the order ID from the payment ID
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection.order.id"],
      filters: { id: data.id }
    })

    const orderId = payments[0]?.payment_collection?.order?.id
    if (!orderId) {
      logger.warn(`[ERPNext Subscriber] Could not resolve order ID for payment ${data.id}.`)
      return
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
      filters: { id: orderId },
    })

    if (!order) {
      logger.error(`[ERPNext Subscriber] Order ${orderId} not found.`)
      return
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
    logger.info(`[ERPNext Subscriber] Order ${orderId} successfully updated/synced to ERPNext as ${erpName} after payment capture.`)
  } catch (error: any) {
    logger.error(`[ERPNext Subscriber] Failed to sync order on payment capture: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
