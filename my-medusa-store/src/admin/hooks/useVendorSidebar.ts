import { useLayoutEffect, useState } from "react"

/**
 * Restricted href path segments that should be hidden from the Vendor sidebar.
 * These are matched against the `href` attribute of sidebar <a> elements.
 *
 * Never include paths that vendors legitimately need:
 *   /app/b2b-quotes, /app/vendor-dashboard, /app/vendor-commission,
 *   /app/products, /app/orders, /app/inventory, etc.
 */
const VENDOR_RESTRICTED_PATHS = [
  "/app/customers",
  "/app/price-lists",
  "/app/settings",
  "/app/vendor-approvals",
  "/app/promotions",
  "/app/pos-users",
]

const CSS_ID = "vendor-sidebar-immediate-protection"

function injectImmediateProtection() {
  if (typeof document === "undefined") return
  if (document.getElementById(CSS_ID)) return

  // Selectors targeting the <a> tag itself. We use precise attribute selectors.
  const linkSelectors = VENDOR_RESTRICTED_PATHS.map(path => `a[href*="${path}"]`).join(",\n  ")
  
  // Safely target the parent ONLY if the link is its direct child to prevent hiding 
  // large wrapping widgets like the user profile menu.
  const liSelectors = VENDOR_RESTRICTED_PATHS.map(path => `li:has(> a[href*="${path}"])`).join(",\n  ")

  const css = `
  /* Stage 1: Immediate Protection for Vendor Sidebar */
  ${linkSelectors} {
    display: none !important;
  }
  ${liSelectors} {
    display: none !important;
  }
  `

  const style = document.createElement("style")
  style.id = CSS_ID
  style.textContent = css
  document.head.appendChild(style)
}

function removeImmediateProtection() {
  if (typeof document === "undefined") return
  const style = document.getElementById(CSS_ID)
  if (style) {
    style.remove()
  }
}

/**
 * Hook that detects the authenticated user's role from the Medusa session
 * and hides admin-only sidebar links for Vendor users.
 *
 * - Implements a 2-stage protection strategy to prevent FOUC (sidebar flash).
 * - Stage 1: Immediately injects CSS to hide restricted links before paint.
 * - Stage 2: Fetches role. If Vendor, keeps CSS + starts observer. If Admin, removes CSS.
 */
// Cache the promise globally to prevent duplicate network requests when multiple widgets mount.
let vendorCheckPromise: Promise<any> | null = null;

export function useVendorSidebar(): { isVendor: boolean | null; isLoading: boolean } {
  const [isVendor, setIsVendor] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useLayoutEffect(() => {
    let observer: MutationObserver | null = null
    let cancelled = false

    injectImmediateProtection()

    const init = async () => {
      try {
        if (!vendorCheckPromise) {
          vendorCheckPromise = fetch("/admin/vendor-check").then(res => {
            setTimeout(() => { vendorCheckPromise = null }, 2000); // Clear cache so future logins work
            if (res.status === 401 || res.status === 403) {
              return null; // Unauthenticated
            }
            return res.json();
          });
        }

        const data = await vendorCheckPromise;

        if (cancelled) return

        if (!data) {
          // Unauthenticated or failed
          setIsVendor(false)
          setIsLoading(false)
          removeImmediateProtection()
          return
        }

        const vendorDetected = !!data.is_vendor
        setIsVendor(vendorDetected)
        setIsLoading(false)

        if (!vendorDetected) {
          removeImmediateProtection()
          return
        }

        // STAGE 2 (Vendor): KEEP PROTECTION & START OBSERVER
        // The injected CSS already hides the links natively.
        // We keep the MutationObserver active as a secondary defense/fallback
        // in case Medusa dynamically injects elements that bypass the CSS selectors.
        const hideSidebarLinks = () => {
          document.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
            const href = link.getAttribute("href") || ""

            if (VENDOR_RESTRICTED_PATHS.some((path) => href.includes(path))) {
              // Hide the anchor strictly
              link.style.setProperty("display", "none", "important")

              // Only hide the direct parent if it's a simple list item container.
              // We do not climb up multiple levels to avoid hiding large sections like user profiles.
              const parent = link.parentElement
              if (parent && parent.tagName.toLowerCase() === "li") {
                parent.style.setProperty("display", "none", "important")
              }
            }
          })
        }

        hideSidebarLinks()

        observer = new MutationObserver(() => {
          hideSidebarLinks()
        })

        observer.observe(document.body, { childList: true, subtree: true })
      } catch (err) {
        if (!cancelled) {
          setIsVendor(false)
          setIsLoading(false)
          // Network failure fallback: don't permanently lock the sidebar
          removeImmediateProtection()
        }
      }
    }

    init()

    // Cleanup: Disconnect observer and remove injected CSS on unmount
    // This ensures smooth transitions during logout/login (Vendor -> Admin)
    return () => {
      cancelled = true
      if (observer) {
        observer.disconnect()
        observer = null
      }
      removeImmediateProtection()
    }
  }, [])

  return { isVendor, isLoading }
}
