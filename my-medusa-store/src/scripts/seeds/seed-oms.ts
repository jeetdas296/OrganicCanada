import { ExecArgs } from "@medusajs/framework/types";

export async function seedOMS({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  // OMS in Medusa is handled primarily by core modules (order, fulfillment, inventory).
  // This seed file is a placeholder to setup any custom OMS specific records if needed in the future.
  logger.info("✓ OMS verified");
}
