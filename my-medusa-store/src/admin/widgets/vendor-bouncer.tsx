import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const SuperVendorBouncer = () => {
  useEffect(() => {
    // DIAGNOSTIC 1: Prove the widget actually loaded
    console.log("🛡️ [BOUNCER] Widget initialized!");

    const enforceVendorRules = async () => {
      try {
        const response = await fetch("/admin/vendor-check");
        const data = await response.json();

        // DIAGNOSTIC 2: Prove the backend correctly identified the vendor
        console.log("🕵️ [BOUNCER] Vendor Check Result:", data);

        if (data.is_vendor) {
          console.log("🚨 [BOUNCER] Vendor confirmed. Activating Nuclear Lockdown!");
          
          const restricted = [
            "customers", "price-lists", "settings", 
            "b2b-quotes", "vendor-approvals", "promotions"
          ];

          // 🛡️ LAYER 1: INSTANT URL BOUNCER
          // If they land directly on a forbidden page, kick them to Orders
          const currentPath = window.location.pathname;
          if (restricted.some(r => currentPath.includes(`/${r}`))) {
             console.warn(`🛑 [BOUNCER] Kicked out of ${currentPath}!`);
             window.location.replace("/app/orders");
             return;
          }

          // 🛡️ LAYER 2: THE MUTATION OBSERVER (React DOM Killer)
          // Watches the screen constantly. If React draws a bad link, it dies instantly.
          const observer = new MutationObserver(() => {
            document.querySelectorAll('a').forEach(link => {
              const href = link.getAttribute('href') || '';
              if (restricted.some(r => href.includes(`/${r}`))) {
                link.style.setProperty("display", "none", "important");
                link.remove(); // Physically delete it from HTML
              }
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });

          // 🛡️ LAYER 3: CLICK INTERCEPTOR
          // If they somehow click a link before it deletes, hijack the click
          window.addEventListener("click", (e) => {
             const target = e.target as HTMLElement;
             const link = target.closest("a");
             if (link && restricted.some(r => link?.href.includes(`/${r}`))) {
                e.preventDefault();
                e.stopPropagation();
                window.location.replace("/app/orders");
             }
          }, true);
        }
      } catch (err) {
        console.error("Bouncer Error:", err);
      }
    };

    enforceVendorRules();
  }, [])

  return null;
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