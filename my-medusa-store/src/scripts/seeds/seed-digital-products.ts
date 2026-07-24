import { ExecArgs } from "@medusajs/framework/types";
import { DIGITAL_ASSET_MODULE } from "../../modules/digital-asset";

export async function seedDigitalProducts({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const digitalAssetService = container.resolve(DIGITAL_ASSET_MODULE);

  if (!digitalAssetService) {
    logger.warn("Digital Asset module not found, skipping digital products seed.");
    return;
  }

  logger.info("Checking for existing Digital Assets...");
  const existingAssets = await digitalAssetService.listDigitalAssets({ name: "My-favourite-recipe-International-Cookbook-University-of-G-ttingen.pdf" });

  if (existingAssets.length === 0) {
    logger.info("Seeding custom Digital Products...");
    await digitalAssetService.createDigitalAssets([
      {
        name: "My-favourite-recipe-International-Cookbook-University-of-G-ttingen.pdf",
        file_url: "https://example.com/static/1780919943600-My-favourite-recipe-International-Cookbook.pdf",
        download_limit: null,
        expires_at: null,
      }
    ]);
    logger.info("✓ Digital Products seeded");
  } else {
    logger.info("✓ Digital Products already seeded, skipping.");
  }
}
