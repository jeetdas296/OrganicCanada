import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function erpOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const erpModuleService = container.resolve("erp")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  logger.info(`[ERPNext Subscriber] Order placed detected: ${data.id}. Fetching details...`)

  try {
    // 1) Fetch order with all possible quantity/price fields
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id: data.id },
      fields: [
        "id",
        "email",
        "payment_status",
        "customer_id",

        // items - main
        "items.id",
        "items.title",
        "items.quantity",
        "items.raw_quantity",
        "items.unit_price",
        "items.raw_unit_price",
        "items.variant_id",

        // items - detail (Medusa v2 often stores qty here)
        "items.detail.quantity",
        "items.detail.raw_quantity",
        "items.detail.fulfilled_quantity",
        "items.detail.shipped_quantity",

        // variant + product
        "items.variant.sku",
        "items.variant.title",
        "items.variant.product.title",
        "items.variant.product.description",

        // customer (joined)
        "customer.email",
        "customer.first_name",
        "customer.last_name",
        "customer.phone",
      ],
    })

    const order = orders?.[0]
    if (!order) {
      logger.error(`[ERPNext Subscriber] Order ${data.id} not found.`)
      return
    }

    // 2) Debug log (remove later)
    console.log("=== ERP ORDER DEBUG ===")
    console.log(JSON.stringify(order, null, 2))
    console.log("=======================")

    // 3) Build customer details
    let customerDetails = {
      email: order.email,
      first_name: "Guest",
      last_name: "Customer",
      phone: undefined as string | undefined,
    }

    if (order.customer) {
      customerDetails = {
        email: order.customer.email || order.email,
        first_name: order.customer.first_name || "Guest",
        last_name: order.customer.last_name || "Customer",
        phone: order.customer.phone || undefined,
      }
    } else if (order.customer_id) {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["email", "first_name", "last_name", "phone"],
        filters: { id: order.customer_id },
      })
      const customer = customers?.[0]
      if (customer) {
        customerDetails = {
          email: customer.email,
          first_name: customer.first_name || "Guest",
          last_name: customer.last_name || "Customer",
          phone: customer.phone || undefined,
        }
      }
    }

    // 4) Map order items with robust qty/price extraction
    const items = (order.items || []).map((it: any) => {
      const qty =
        Number(it?.quantity) ||
        Number(it?.raw_quantity?.value) ||
        Number(it?.detail?.quantity) ||
        Number(it?.detail?.raw_quantity?.value) ||
        0

      const unitPrice =
        Number(it?.unit_price) ||
        Number(it?.raw_unit_price?.value) ||
        0

      return {
        variant_id: it.variant_id,
        quantity: qty,
        unit_price: unitPrice,
        variant: {
          sku: it?.variant?.sku,
          title: it?.variant?.title,
          product: {
            title: it?.variant?.product?.title,
            description: it?.variant?.product?.description,
          },
        },
      }
    })

    // 5) Send to ERP
    const erpName = await erpModuleService.syncOrder(
      {
        id: order.id,
        customer_id: order.customer_id,
        email: order.email,
        payment_status: order.payment_status,
        items,
      },
      customerDetails
    )

    logger.info(
      `[ERPNext Subscriber] Order ${data.id} successfully synced to ERPNext as ${erpName}.`
    )
  } catch (error: any) {
    logger.error(
      `[ERPNext Subscriber] Failed to sync order ${data.id} on placement: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}