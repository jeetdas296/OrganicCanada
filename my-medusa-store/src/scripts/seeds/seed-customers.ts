import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export async function seedCustomers({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  logger.info("Checking for existing customers...");
  const existingCustomers = await customerModuleService.listCustomers({ email: "guest@eatsie.com" });

  if (existingCustomers.length === 0) {
    logger.info("Seeding standard customers...");
    await customerModuleService.createCustomers([
      {
        email: "guest@eatsie.com",
        first_name: "Guest",
        last_name: "User",
      },
      {
        email: "yapak96122@mugstock.com",
        first_name: "Jeet",
        last_name: "Das",
      },
    ]);
    logger.info("✓ Customers seeded");
  } else {
    logger.info("✓ Customers already seeded, skipping.");
  }
}
