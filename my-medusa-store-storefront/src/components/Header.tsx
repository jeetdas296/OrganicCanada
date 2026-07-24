import Link from 'next/link';
export const dynamic = "force-dynamic";
import SearchBar from "../app/[countryCode]/(main)/search/SearchBar"; // Update with actual path
import CartButton from "@modules/layout/components/cart-button";
import { signout } from "@lib/data/customer";

export default async function Header({ customer, countryCode }: { customer: any; countryCode: string }) {
  let productTypes = [];
  try {
    const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
    // 1. Fetch Product Types from the Storefront API
    const res = await fetch(`${backendUrl}/store/product-types`, {
      headers: {
        "x-publishable-api-key": pubKey,
      },
      // Cache this data for 1 hour so it doesn't slow down your website
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      productTypes = data.product_types || [];
    }
  } catch (error) {
    console.error("Failed to fetch product types", error);
  }

  async function handleLogout() {
    "use server";
    await signout(countryCode);
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm osahan-header py-0">
      <div className="container">
        <Link href={`/${countryCode}`} className="navbar-brand me-0 me-lg-3 me-md-3">
          <img
            src="/img/logo_organic_canada.svg"
            alt="#"
            className="img-fluid d-none d-md-block"
            style={{ width: '201px', height: '80px' }}
          />
          <img
            src="/img/fav1.png"
            alt="#"
            className="d-block d-md-none d-lg-none img-fluid"
          />
        </Link>

        <a href="#" className="ms-3 text-left d-flex text-dark align-items-center gap-2 text-decoration-none bg-white border-0 me-auto" data-bs-toggle="modal" data-bs-target="#add-delivery-location">
          <i className="bi bi-geo-alt-fill fs-5 text-success"></i>
          <span>
            <b>Delivery in 15 minutes</b>
            <div className="small text-success">Sant Pura, Industrial Area...<i className="bi bi-arrow-right-circle-fill ms-1"></i></div>
          </span>
        </a>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <SearchBar />

        <div
          className="collapse navbar-collapse"
          id="navbarSupportedContent"
          style={{ visibility: 'visible' }}>

          <ul className="navbar-nav ms-auto me-3 top-link">

            <li className="nav-item dropdown">
              <a className="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Shop Pages<i className="bi bi-chevron-down small ms-1"></i>
              </a>
              <ul className="dropdown-menu">
                <li><Link href={`/${countryCode}/listing`} className="dropdown-item">All Product</Link></li>
                {productTypes.length > 0 ? (
                  productTypes.map((type: any) => (
                    <li key={type.id}>
                      <Link
                        href={`/${countryCode}/listing?type_id=${type.id}`}
                        className="dropdown-item"
                      >
                        {type.value}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li><span className="dropdown-item text-muted small">No types found</span></li>
                )}
              </ul>
            </li>

            <li className="nav-item dropdown">
              <a className="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Profile<i className="bi bi-chevron-down small ms-1"></i>
              </a>
              <ul className="dropdown-menu">
                <li><Link href={`/${countryCode}/profile`} className="dropdown-item">Orders List</Link></li>
                <li><Link href={`/${countryCode}/profile`} className="dropdown-item">Addresses</Link></li>
                <li><Link href={`/${countryCode}/profile`} className="dropdown-item">Manage Payments</Link></li>
                <li><Link href={`/${countryCode}/profile`} className="dropdown-item">Eatsie Cash</Link></li>
                <li><Link href={`/${countryCode}/profile`} className="dropdown-item">Support / Help</Link></li>
              </ul>
            </li>

            <li className="nav-item dropdown">
              <a className="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Extra Page<i className="bi bi-chevron-down small ms-1"></i>
              </a>
              <ul className="dropdown-menu">
                <li><Link href={`/${countryCode}/about`} className="dropdown-item">About us</Link></li>
                <li><Link href={`/${countryCode}/jobs`} className="dropdown-item">Jobs</Link></li>
                <li><Link href={`/${countryCode}/contact`} className="dropdown-item">Contact Us</Link></li>
                <li><Link href={`/${countryCode}/cupons`} className="dropdown-item">Cupons</Link></li>
                <li><Link href={`/${countryCode}/sell-with-us`} className="dropdown-item">Vendor</Link></li>
                <li><Link href={`/${countryCode}/wholesale`} className="dropdown-item">Wholesale</Link></li>
              </ul>
            </li>

          </ul>

          <div className="d-flex align-items-center gap-2">
            <CartButton />
            {customer ? (
              <form action={handleLogout}>
                <button type="submit" className="list-group-item list-group-item-action text-danger mt-3 fw-bold border-top w-100 text-start">
                  <i className="icofont-logout me-2"></i> LogOut
                </button>
              </form>
            ) : (
              <Link
                href={`/${countryCode}/login`}
                className="btn btn-success rounded-pill px-3 text-uppercase ms-2"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 🟢 THE FIX: A lightweight script to activate Bootstrap Toggles & Dropdowns on Mobile */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined' && !window.osahanNavScriptLoaded) {
            window.osahanNavScriptLoaded = true;
            
            document.addEventListener('click', function(e) {
              // 1. Handle Mobile Hamburger Menu Toggle
              var toggler = e.target.closest('.navbar-toggler');
              if (toggler) {
                var targetId = toggler.getAttribute('data-bs-target');
                if (targetId) {
                  var target = document.querySelector(targetId);
                  if (target) {
                    target.classList.toggle('show');
                  }
                }
                return;
              }

              // 2. Handle Dropdowns (Shop Pages, Profile, Extra Page)
              var dropdown = e.target.closest('[data-bs-toggle="dropdown"]');
              if (dropdown) {
                e.preventDefault();
                var menu = dropdown.nextElementSibling;
                var isCurrentlyOpen = menu && menu.classList.contains('show');
                
                // Close all other open dropdowns
                document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
                  m.classList.remove('show');
                });

                // Toggle the clicked dropdown
                if (menu && !isCurrentlyOpen) {
                  menu.classList.add('show');
                }
                return;
              }

              // 3. Click outside closes dropdowns
              if (!e.target.closest('.dropdown-menu') && !e.target.closest('.nav-item.dropdown')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
                  m.classList.remove('show');
                });
              }
            });
          }
        `
      }} />
    </nav>
  );
}