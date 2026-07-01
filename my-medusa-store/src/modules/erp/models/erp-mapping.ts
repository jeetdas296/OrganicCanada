import { model } from "@medusajs/framework/utils"

export const ErpMapping = model.define("erp_mapping", {
  id: model.id({ prefix: "erpm" }).primaryKey(),
  medusa_entity_type: model.text(), // 'customer' | 'product' | 'variant' | 'order'
  medusa_id: model.text(),
  erp_doctype: model.text(), // 'Customer' | 'Item' | 'Sales Order'
  erp_name: model.text(), // Primary key in ERPNext (name/ID)
})
