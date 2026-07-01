import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function erpVariantUpsertHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  const erpModuleService = container.resolve("erp")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  try {
    // Fetch variant + product + prices
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "sku",
        "title",
        "product.id",
        "product.title",
        "product.description",
        "prices.*",
      ],
      filters: { id: data.id },
    })

    const variant = variants?.[0]
    if (!variant) {
      logger.warn(`[ERPNext Subscriber] ${name}: variant ${data.id} not found`)
      return
    }

    if (!variant.sku) {
      logger.info(`[ERPNext Subscriber] ${name}: variant ${variant.id} has no SKU yet, skipping`)
      return
    }

    const priceAmount = variant.prices?.[0]?.amount

    const erpCode = await erpModuleService.syncProductVariant({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      product: {
        title: variant.product?.title,
        description: variant.product?.description || undefined,
      },
      price: priceAmount,
    })

    logger.info(`[ERPNext Subscriber] ${name}: synced variant ${variant.id} (SKU ${variant.sku}) -> ERP Item ${erpCode}`)
  } catch (e: any) {
    logger.error(`[ERPNext Subscriber] ${name}: failed syncing variant ${data.id}: ${e?.message || e}`)
  }
}

export const config: SubscriberConfig = {
  // One of these will exist depending on your Medusa version.
  // We'll confirm by checking which events appear in your logs.
  event: [
    "product-variant.created",
    "product-variant.updated",
    "product_variant.created",
    "product_variant.updated",
  ],
}