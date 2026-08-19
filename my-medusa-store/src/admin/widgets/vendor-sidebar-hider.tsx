import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useVendorSidebar } from "../hooks/useVendorSidebar"

/**
 * Widget that uses the shared useVendorSidebar hook to hide
 * admin-only sidebar links when a Vendor is logged in.
 * Mounts on list pages where widget zones are available.
 * Extension pages call the hook directly from their own components.
 */
export default function VendorSidebarHider() {
  useVendorSidebar()
  return null
}

export const config = defineWidgetConfig({
  zone: [
    "product.list.before",
    "order.list.before",
    "customer.list.before",
  ],
})
