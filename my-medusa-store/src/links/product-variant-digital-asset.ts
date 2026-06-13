import ProductModule from "@medusajs/product"
import DigitalAssetModule from "../modules/digital-asset"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  ProductModule.linkable.productVariant,
  {
    linkable: DigitalAssetModule.linkable.digitalAsset,
    isList: true, // Set to true if a single variant (like a bundle) gives the user multiple files!
  }
)