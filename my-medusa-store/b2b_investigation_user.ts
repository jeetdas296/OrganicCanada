import { MedusaContainer } from "@medusajs/framework/types";

export default async function investigateUser({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");

  console.log("=== STARTING USER DIAGNOSIS ===");

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email", "vendor.*"],
  });

  const vendorUsers = users.filter(u => u.vendor);
  console.log(`Found ${vendorUsers.length} users with vendors.`);
  
  if (vendorUsers.length > 0) {
    const vu = vendorUsers[0];
    console.log("First Vendor User:", vu.id, vu.email, "Vendor ID:", vu.vendor?.id);
  }

  console.log("\n=== END DIAGNOSIS ===");
}
