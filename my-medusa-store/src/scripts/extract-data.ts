import { ExecArgs } from "@medusajs/framework/types";

export default async function extractData({ container }: ExecArgs) {
  const query = container.resolve("query");

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "title", "handle", "description",
      "options.*",
      "variants.*",
      "variants.prices.*",
    ],
    pagination: { skip: 0, take: 2 },
  });

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["email", "first_name", "last_name"],
    pagination: { skip: 0, take: 2 },
  });

  console.log("=== PRODUCTS ===");
  console.log(JSON.stringify(products, null, 2));

  console.log("=== CUSTOMERS ===");
  console.log(JSON.stringify(customers, null, 2));
}
