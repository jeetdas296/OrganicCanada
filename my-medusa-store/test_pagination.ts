import { MedusaContainer } from "@medusajs/framework/types";

export default async function investigatePagination({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  
  const { data: products15 } = await query.graph({
    entity: "product",
    fields: ["id"]
  });

  const { data: productsAll } = await query.graph({
    entity: "product",
    fields: ["id"],
    pagination: { take: 100 }
  });

  console.log("Default fetch count:", products15.length);
  console.log("All fetch count:", productsAll.length);
}
