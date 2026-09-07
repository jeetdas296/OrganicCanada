import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"
import { PalShipmentTimelineStep } from "./shipment-timeline-step"

export const PalShipmentTimeline = model.define("pal_shipment_timeline", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  scenario: model.text(),
  steps: model.hasMany(() => PalShipmentTimelineStep, { mappedBy: "timeline" })
})
