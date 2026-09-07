import { model } from "@medusajs/framework/utils"
import { PalShipment } from "./shipment"

export const PalShipmentItem = model.define("pal_shipment_item", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => PalShipment),
  
  order_item_id: model.text().nullable(),
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  
  sku: model.text().nullable(),
  title: model.text(),
  
  quantity: model.number(),
  unit_price: model.bigNumber().nullable(),
  total_value: model.bigNumber().nullable(),
  
  weight: model.number().nullable(),
  
  hs_code: model.text().nullable(),
  country_of_origin: model.text().nullable(),
  
  product_description: model.text().nullable(),
})