import { ExecArgs } from "@medusajs/framework/types";

export default async function ({ container }: ExecArgs) {
  const query = container.resolve("query");

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "metadata",
      "created_at",
      "items.*",
      "items.product_id"
    ],
    filters: {
      metadata: { is_b2b_quote: true }
    } as any
  });

  console.log(`Found ${orders.length} B2B quotes WITH ITEMS.*`);
  const uniqueIds = new Set(orders.map(o => o.id));
  console.log(`Unique quotes: ${uniqueIds.size}`);
}
