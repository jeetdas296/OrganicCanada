import { MedusaContainer } from "@medusajs/framework/types";
import { GET } from "./src/api/admin/b2b-quotes/route";

export default async function testRoute({ container }: { container: MedusaContainer }) {
  console.log("=== TESTING ROUTE RESPONSE ===");
  const req = {
    scope: container,
    url: "http://localhost:9000/admin/b2b-quotes",
    headers: { host: "localhost:9000" },
    query: {},
    auth_context: { actor_id: "user_01KT6YMPXMFY5TW945AXHQF994" } // Real Vendor User ID
  } as any;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    }
  } as any;

  await GET(req, res);

  console.log("STATUS CODE:", statusCode);
  console.log("RESPONSE DATA:", JSON.stringify(responseData, null, 2));
}
