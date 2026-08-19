import { MedusaContainer } from "@medusajs/framework/types";
import { COMPANY_MODULE } from "./src/modules/company";

export default async function investigateConversations({ container }: { container: MedusaContainer }) {
  const companyService = container.resolve(COMPANY_MODULE);
  
  try {
    const [convs] = await companyService.listQuoteConversations({
      quote_id: ["order_123", "order_123_vendor1"]
    });
    console.log("Success! Array works:", convs.length);
  } catch (e: any) {
    console.log("Array Failed:", e.message);
  }
}
