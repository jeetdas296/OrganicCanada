import { ExecArgs } from "@medusajs/framework/types";

export async function seedB2B({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  logger.info("Skipping B2B seed as there is no real data available in the source database.");
}
