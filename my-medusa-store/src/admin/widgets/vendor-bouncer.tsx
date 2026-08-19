import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { useVendorSidebar } from "../hooks/useVendorSidebar"

const SuperVendorBouncer = () => {
  const { isVendor } = useVendorSidebar()

  useEffect(() => {
    if (!isVendor) return

    // 🛡️ LAYER 1: INSTANT URL BOUNCER
    // If they land directly on a forbidden page, kick them to Orders
    const restricted = [
      "customers", "price-lists", "settings",
      "vendor-approvals", "promotions"
    ]

    const currentPath = window.location.pathname
    if (restricted.some(r => currentPath.includes(`/${r}`))) {
      console.warn(`🛑 [BOUNCER] Kicked out of ${currentPath}!`)
      window.location.replace("/app/orders")
      return
    }

    // 🛡️ LAYER 2: CLICK INTERCEPTOR
    // If they somehow click a link before it hides, hijack the click
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Allow logout, auth, and login actions to bypass the interceptor completely
      const closestElement = target.closest("button, a")
      const text = closestElement?.textContent?.toLowerCase() || ""
      if (text.includes("log out") || text.includes("logout") || target.closest("[href*='/login']") || target.closest("[href*='/auth']")) {
        return
      }

      const link = target.closest("a")
      
      // Safety constraint: Only intercept links that are actually part of a navigation sidebar!
      // This guarantees we never accidentally intercept the profile dropdown, logout, or other UI components.
      if (!link || !link.closest("nav")) {
        return
      }

      if (restricted.some(r => link.href.includes(`/${r}`))) {
        e.preventDefault()
        e.stopPropagation()
        window.location.replace("/app/orders")
      }
    }

    window.addEventListener("click", clickHandler, true)

    return () => {
      window.removeEventListener("click", clickHandler, true)
    }
  }, [isVendor])

  return null
}

// 🟢 Mount on every major list page so the Bouncer never falls asleep!
export const config = defineWidgetConfig({
  zone: [
    "product.list.before",
    "order.list.before",
    "customer.list.before",
    "price_list.list.before",
    "promotion.list.before"
  ],
})

export default SuperVendorBouncer