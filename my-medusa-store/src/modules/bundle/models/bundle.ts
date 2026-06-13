import { model } from "@medusajs/framework/utils"

// The BundleItem tracks each component product inside a bundle
export const BundleItem = model.define("bundle_item", {
  id: model.id({ prefix: "bndi" }).primaryKey(),
  bundle: model.belongsTo(() => Bundle, { mappedBy: "items" }),
  product_id: model.text(),       // The Medusa Product ID of the component
  quantity: model.number().default(1), // How many of this product are in the bundle (e.g., 2x Coffee Mugs)
})

// The Bundle is the parent entity that groups multiple component products together
export const Bundle = model.define("bundle", {
  id: model.id({ prefix: "bndl" }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
  items: model.hasMany(() => BundleItem, { mappedBy: "bundle" }),
})
