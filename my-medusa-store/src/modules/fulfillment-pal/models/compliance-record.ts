import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalComplianceRecord = model.define("pal_compliance_record", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  trade_type: model.enum(["DOMESTIC", "CROSS_BORDER"]),
  trade_direction: model.enum(["DOMESTIC", "EXPORT", "IMPORT"]),
  
  status: model.enum(["PENDING", "VALIDATING", "READY", "BLOCKED", "CLEARED"]),
  
  incoterm: model.text().nullable(),
  
  customs_status: model.text().nullable(),
})