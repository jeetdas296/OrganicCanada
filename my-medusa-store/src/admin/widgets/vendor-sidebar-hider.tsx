import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

function useSidebarHider() {
  useEffect(() => {
    let observer: MutationObserver | null = null

    fetch("/admin/me/role")
      .then(res => res.json())
      .then(data => {
        if (data.role !== "vendor") return

        const hideLink = () => {
          document.querySelectorAll<HTMLAnchorElement>("a").forEach(link => {
            if ((link.getAttribute("href") || "").includes("pos-users")) {
              // Walk up 6 levels to find the sidebar nav item wrapper and hide it
              let el: HTMLElement | null = link
              for (let i = 0; i < 6; i++) {
                const parent = el?.parentElement
                if (!parent) break
                el = parent
                const tag = el.tagName?.toLowerCase()
                // Most admin sidebars wrap links in a div or li
                if (tag === "li" || tag === "nav" || (tag === "div" && el.childElementCount === 1)) {
                  el.style.setProperty("display", "none", "important")
                  break
                }
              }
              link.style.setProperty("display", "none", "important")
            }
          })
        }

        // Run immediately in case DOM is already rendered
        hideLink()

        // Observe DOM for sidebar being rendered asynchronously
        observer = new MutationObserver(hideLink)
        observer.observe(document.body, { childList: true, subtree: true })
      })
      .catch(() => {})

    return () => observer?.disconnect()
  }, [])
}

// Inject this widget into as many valid pages as possible so the hider fires
// regardless of which page the vendor lands on first.
export default function VendorSidebarHiderOnProducts() {
  useSidebarHider()
  return null
}

export const config = defineWidgetConfig({
  zone: [
    "product.list.before",
    "order.list.before",
    "customer.list.before",
  ],
})
