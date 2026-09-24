import { model } from "@medusajs/framework/utils"

export const CustomerNotification = model.define("customer_notification", {
  id: model.id().primaryKey(),
  customer_id: model.text().searchable(),
  
  title: model.text(),
  message: model.text(),
  
  entity_type: model.text(),
  entity_id: model.text(),
  
  idempotency_key: model.text(),
  
  read_at: model.dateTime().nullable(),
  
  metadata: model.json().nullable(),
}).cascades({
  delete: []
}).indexes([
  {
    name: "IDX_customer_notification_customer_id",
    on: ["customer_id"],
  },
  {
    name: "IDX_customer_notification_idempotency_key_global",
    on: ["idempotency_key"],
    unique: true,
    where: "deleted_at IS NULL OR deleted_at IS NOT NULL",
  }
])
