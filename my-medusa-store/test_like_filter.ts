import { GET } from "./src/api/admin/b2b-quotes/[id]/negotiation/route";
import { MedusaContainer } from "@medusajs/framework/types";
import { COMPANY_MODULE } from "./src/modules/company";

export default async function investigateConversations({ container }: { container: MedusaContainer }) {
  const companyService = container.resolve(COMPANY_MODULE);
  
  const quote_id = "order_123"; // Dummy
  
  // Test if $like works
  try {
    const [convs] = await companyService.listQuoteConversations({
      quote_id: { $like: `${quote_id}%` }
    } as any);
    console.log("Success! $like works:", convs.length);
  } catch (e: any) {
    console.log("$like Failed:", e.message);
  }
}
