import { defineLink } from "@medusajs/framework/utils"
import UserModule from "@medusajs/medusa/user"
import VendorModule from "../modules/vendor" // 🟢 Ensure this path points to your actual vendor module file!

export default defineLink(
  UserModule.linkable.user,
  VendorModule.linkable.vendor
)