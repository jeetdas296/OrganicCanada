import { MedusaContainer } from "@medusajs/framework/types";

export default async function investigateDML({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  
  try {
    const { data } = await query.graph({
      entity: "quote_message",
      fields: ["id", "metadata"],
    });
    console.log("Success! quote_message has metadata. Length:", data.length);
  } catch (e: any) {
    console.log("quote_message metadata Failed:", e.message);
  }
}
