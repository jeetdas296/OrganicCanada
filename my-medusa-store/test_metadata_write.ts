import { MedusaContainer } from "@medusajs/framework/types";
import { COMPANY_MODULE } from "./src/modules/company";

export default async function testMetadataWrite({ container }: { container: MedusaContainer }) {
  const companyService = container.resolve(COMPANY_MODULE);
  
  try {
    const msg = await companyService.createQuoteMessages({
      conversation_id: "qconv_test123", // Assuming this doesn't strictly foreign key check, or we might get an error
      sender_type: "admin",
      sender_id: "test",
      text: "test",
      metadata: { vendor_id: "vendor_123" }
    } as any); // using 'as any' just in case typing doesn't expose metadata
    console.log("Success! Message created with metadata:", msg.metadata);
  } catch (e: any) {
    console.log("Metadata Write Failed:", e.message);
  }
}
