// src/links/b2b-quote-order.ts
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import B2BModule from "../modules/b2b"

export default defineLink(
  B2BModule.linkable.quote,
  OrderModule.linkable.order
)