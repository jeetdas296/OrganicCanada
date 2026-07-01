import { model } from "@medusajs/framework/utils"

export const ErpSyncLog = model.define("erp_sync_log", {
  id: model.id({ prefix: "erpl" }).primaryKey(),
  direction: model.text(), // 'to_erp' | 'from_erp'
  entity_type: model.text(), // 'customer' | 'product' | 'variant' | 'order'
  medusa_id: model.text(),
  status: model.text(), // 'success' | 'failed'
  error: model.text().nullable(),
  payload_hash: model.text().nullable(),
})
