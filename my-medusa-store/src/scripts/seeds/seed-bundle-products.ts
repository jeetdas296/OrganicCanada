import { ExecArgs } from "@medusajs/framework/types";

export async function seedBundleProducts({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  logger.info("Skipping Bundle Products seed as there is no real data available in the source database.");
}
