import { ExecArgs } from "@medusajs/framework/types";
import { SUBSCRIPTION_MODULE } from "../../modules/subscription";

export async function seedSubscriptions({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const query = container.resolve("query");
  const subscriptionService = container.resolve(SUBSCRIPTION_MODULE);

  if (!subscriptionService) {
    logger.warn("Subscription module not found, skipping subscriptions seed.");
    return;
  }

  logger.info("Checking for existing Subscriptions...");
  const existingSubs = await subscriptionService.listSubscriptions({ status: "active" });

  if (existingSubs.length === 0) {
    // Dynamically look up customer and variant so we don't hardcode IDs
    const { data: customers } = await query.graph({ entity: "customer", fields: ["id"], filters: { email: "yapak96122@mugstock.com" } });
    const { data: variants } = await query.graph({ entity: "variant", fields: ["id"], filters: { sku: "Apple1" } });

    const customerId = customers[0]?.id;
    const variantId = variants[0]?.id;

    if (!customerId || !variantId) {
      logger.warn("Required customer or variant for subscription seed not found, skipping.");
      return;
    }

    logger.info("Seeding custom Subscriptions...");
    await subscriptionService.createSubscriptions([
      {
        customer_id: customerId,
        original_order_id: "order_mock_subscription_01",
        variant_id: variantId,
        stripe_payment_method_id: "pm_card_visa",
        status: "active",
        interval: "monthly",
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
      }
    ]);
    logger.info("✓ Subscriptions seeded");
  } else {
    logger.info("✓ Subscriptions already seeded, skipping.");
  }
}
