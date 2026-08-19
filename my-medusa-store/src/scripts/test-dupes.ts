import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ExecArgs } from "@medusajs/framework/types";

export default async function ({ container }: ExecArgs) {
  // Let's directly query the OrderService or internal remote query for draft orders
  // just like the core API does.
  const remoteQuery = container.resolve("remoteQuery");
  
  const q = {
    entity: "order",
    fields: [
      "id",
      "status",
      "items.*"
    ],
    // The actual core API might not filter by b2b_quote, it just fetches all draft orders
  }
  
  // Wait, I can just do a fetch if the server is running.
}
