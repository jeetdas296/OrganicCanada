import { ExecArgs } from "@medusajs/framework/types";
import { POS_MODULE } from "../../modules/pos";

export async function seedPOS({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const posService = container.resolve(POS_MODULE);

  if (!posService) {
    logger.warn("POS module not found, skipping POS seed.");
    return;
  }

  logger.info("Checking for existing POS users...");
  const existingUsers = await posService.listPosUsers({ email: "pos@gmail.com" });

  if (existingUsers.length === 0) {
    logger.info("Seeding custom POS users...");
    await posService.createPosUsers([
      {
        email: "pos@gmail.com",
        password_hash: "$2b$10$dummyHashStringDummyHashStringDummyHashString12345", // Dummy bcrypt hash format
        full_name: "POS",
        role: "cashier",
        active: true,
      },
    ]);
    logger.info("✓ POS seed completed");
  } else {
    logger.info("✓ POS users already seeded, skipping.");
  }
}
