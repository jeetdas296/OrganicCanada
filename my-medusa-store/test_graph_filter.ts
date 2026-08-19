import { MedusaContainer } from "@medusajs/framework/types";

export default async function investigateConversations({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  
  try {
    const { data: convs } = await query.graph({
      entity: "quote_conversation",
      fields: ["id", "quote_id"],
      filters: { quote_id: { $like: "order_123%" } } as any
    });
    console.log("Success! graph query works:", convs.length);
  } catch (e: any) {
    console.log("graph query Failed:", e.message);
  }
}
