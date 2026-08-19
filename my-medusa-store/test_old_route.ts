import { MedusaContainer } from "@medusajs/framework/types";

export default async function investigateOldLogic({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");

  const vendorId = "01KT6YMPX9WS6E3A6PJ9FTK7J0";
  
  // EXACT OLD LOGIC:
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "vendor.*"]
  });
  
  const vendorProductIds = products.filter((p: any) => p.vendor?.id === vendorId).map((p: any) => p.id);
  console.log("Old logic vendorProductIds:", vendorProductIds);

  const { data: quotes } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "email", "currency_code", "status",
      "created_at", "metadata", "customer_id",
      "items.*",
      "items.product_id",
      "items.variant_id",
      "items.product.*",
      "items.product.vendor.*"
    ],
    filters: {
      metadata: { is_b2b_quote: true }
    } as any,
    pagination: {
      skip: 0,
      take: 100,
      order: { created_at: "DESC" },
    },
  });

  const vendorQuotes = quotes.filter((q: any) => {
    const hasItem = q.items?.some((item: any) => vendorProductIds.includes(item.product_id));
    return hasItem;
  });

  console.log("Old logic vendorQuotes count:", vendorQuotes.length);
  if (vendorQuotes.length > 0) {
    console.log("Matched quote:", vendorQuotes[0].id);
  }
}
