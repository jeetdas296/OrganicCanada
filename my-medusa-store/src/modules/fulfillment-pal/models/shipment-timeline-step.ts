import { model } from "@medusajs/framework/utils"
import { PalShipmentTimeline } from "./shipment-timeline"

export const PalShipmentTimelineStep = model.define("pal_shipment_timeline_step", {
  id: model.id().primaryKey(),
  timeline: model.belongsTo(() => PalShipmentTimeline),
  
  step_code: model.text(),
  step_name: model.text(),
  step_order: model.number(),
  
  status: model.enum(["LOCKED", "AVAILABLE", "IN_PROGRESS", "CONFIGURED", "COMPLETED", "BLOCKED"]),
  
  configuration: model.json().nullable(),
  
  started_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  completed_by: model.text().nullable(),
  
  notes: model.text().nullable()
})
