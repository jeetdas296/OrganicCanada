import { ExecArgs } from "@medusajs/framework/types";
import { VENDOR_MODULE } from "../../modules/vendor";

export async function seedVendors({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const vendorService = container.resolve(VENDOR_MODULE);

  if (!vendorService) {
    logger.warn("Vendor module not found, skipping vendor seed.");
    return;
  }

  logger.info("Checking for existing vendors...");
  const existingVendors = await vendorService.listVendors({ email: "finalfarmer@gmail.com" });

  if (existingVendors.length === 0) {
    logger.info("Seeding custom vendors...");
    await vendorService.createVendors([
      {
        name: "Farmer",
        email: "finalfarmer@gmail.com",
        handle: "farmer",
        commission_rate: 15,
        is_active: true,
      },
      {
        name: "abs",
        email: "munitions@gmail.com",
        handle: "abs",
        commission_rate: 10,
        is_active: true,
      },
    ]);
    logger.info("✓ Vendor seed completed");
  } else {
    logger.info("✓ Vendors already seeded, skipping.");
  }
}
