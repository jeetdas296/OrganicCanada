import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BundleModule from "../modules/bundle"

// 1-to-1 Link: A Product *is* a Bundle
// This lets us query: product → bundle (to check if a product is a bundle)
// and also: bundle → product (to find which product a bundle belongs to)
export default defineLink(
  ProductModule.linkable.product,
  BundleModule.linkable.bundle
)
