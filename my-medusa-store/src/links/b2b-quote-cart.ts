// src/links/b2b-quote-cart.ts
import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import B2BModule from "../modules/b2b"

export default defineLink(
  B2BModule.linkable.quote,
  CartModule.linkable.cart
)