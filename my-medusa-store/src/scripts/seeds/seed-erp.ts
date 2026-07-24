import { ExecArgs } from "@medusajs/framework/types";
import { ERP_MODULE } from "../../modules/erp";

export async function seedERP({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const erpService = container.resolve(ERP_MODULE);
  const query = container.resolve("query");

  if (!erpService) {
    logger.warn("ERP module not found, skipping ERP seed.");
    return;
  }

  logger.info("Checking for existing ERP mappings...");
  const existingMappings = await erpService.listErpMappings({ erp_name: "Apple1" });

  if (existingMappings.length === 0) {
    // Dynamically look up variant ID
    const { data: variants } = await query.graph({ entity: "variant", fields: ["id", "sku"], filters: { sku: "Apple1" } });
    const variantId = variants[0]?.id;

    if (!variantId) {
      logger.warn("Required variant for ERP seed not found, skipping.");
      return;
    }

    logger.info("Seeding custom ERP mappings...");
    await erpService.createErpMappings([
      {
        medusa_entity_type: "variant",
        medusa_id: variantId,
        erp_doctype: "Item",
        erp_name: "Apple1",
      }
    ]);
    logger.info("✓ ERP configuration verified");
  } else {
    logger.info("✓ ERP mappings already seeded, skipping.");
  }
}
