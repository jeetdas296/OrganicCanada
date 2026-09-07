import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalCustomsDeclaration = model.define("pal_customs_declaration", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  declaration_type: model.text(),
  status: model.text(),
  customs_reference: model.text().nullable(),
  
  declared_value: model.bigNumber().nullable(),
  currency: model.text().nullable(),
  
  duties: model.bigNumber().nullable(),
  taxes: model.bigNumber().nullable(),
  
  export_country: model.text().nullable(),
  import_country: model.text().nullable(),
  
  submitted_at: model.dateTime().nullable(),
  cleared_at: model.dateTime().nullable(),
})