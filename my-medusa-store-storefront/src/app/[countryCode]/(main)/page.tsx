import Link from 'next/link';
// ✅ IMPORT YOUR CUSTOM SDK FUNCTION HERE
// Adjust the path "@lib/data/categories" if your file is named something else!
import { listCategories } from "@lib/data/categories";

export default async function Home(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const countryCode = params.countryCode;
  let categories: any[] = [];
  try {
    // Calling your function to get the categories
    categories = await listCategories();
  } catch (error) {
    console.error("Failed to fetch categories using SDK. Showing template defaults.", error);
  }

  return (
    <>
      {/* 1. Top Green Promo Bar */}
      <section className="bg-success">
        <div className="container">
          <div className="row py-3">
            <div className="d-flex gap-3 align-items-center">
              <img src="/img/fav.png" className="img-fluid d-none d-md-block h-40" alt="icon" />
              <div className="text-white">
                Download the app and get <b className="text-warning-light rounded-pill">25% OFF</b> on your first order!
              </div>
              <a href="#app-section" className="text-nowrap ms-auto text-decoration-none d-flex align-items-center text-success border-0 btn btn-light rounded-pill">
                <span className="ms-1 d-none d-md-block text-dark">Download Eatsie App Now&nbsp;</span>
                <span><i className="bi bi-chevron-right text-success"></i></span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Banner & Grids */}
      <section className="main-banner bg-white pt-4">
        <div className="container">
          <div id="carouselExampleFade" className="carousel slide carousel-fade mb-4" data-bs-ride="carousel">
            <div className="carousel-inner rounded">
              <div className="carousel-item active">
                <Link href={`/${countryCode}/listing`}><img src="/img/banner1.png" className="d-block w-100" alt="Banner 1" /></Link>              </div>
              <div className="carousel-item">
                <Link href={`/${countryCode}/packages`}><img src="/img/banner2.png" className="d-block w-100" alt="Banner 2" /></Link>              </div>
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleFade" data-bs-slide="prev">
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleFade" data-bs-slide="next">
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-4 g-4">
            <div className="col"><Link href={`/${countryCode}/listing`}><img src="/img/l1.png" alt="#" className="img-fluid rounded-3" /></Link></div>
            <div className="col"><Link href={`/${countryCode}/listing`}><img src="/img/l3.png" alt="#" className="img-fluid rounded-3" /></Link></div>
            <div className="col"><Link href={`/${countryCode}/listing`}><img src="/img/l4.png" alt="#" className="img-fluid rounded-3" /></Link></div>
            <div className="col"><Link href={`/${countryCode}/listing`}><img src="/img/l2.png" alt="#" className="img-fluid rounded-3" /></Link></div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC SECTION: Explore our Range of Categories */}
      <section className="bg-white">
        <div className="container py-5">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h5 className="mb-0 fw-bold">Explore our Categories</h5>
            <Link className="text-decoration-none text-success" href={`/${countryCode}/listing`}>View All <i className="bi bi-arrow-right-circle-fill ms-1"></i></Link>          </div>

          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-4 homepage-products-range">

            {/* ✅ DYNAMIC MAPPING: If Medusa has Categories, map over them! */}
            {categories && categories.length > 0 ? (
              categories.map((category: any, index: number) => {
                // Dynamically assign an image from your template (1 through 12) based on the loop index
                const imgIndex = (index % 12) + 1;

                return (
                  <div className="col" key={category.id}>
                    <div className="text-center position-relative border rounded pb-4">
                      <img src={`/img/${imgIndex}.png`} className="img-fluid rounded-3 p-3" alt={category.name} />
                      <div className="listing-card-body pt-0">
                        <h6 className="card-title mb-1 fs-14">{category.name}</h6>
                        <p className="card-text small text-success">Explore items</p>
                      </div>
                      {/* Linking dynamically to a specific category handle */}
                      <Link href={`/${countryCode}/categories/${category.handle}`} className="stretched-link"></Link>                    </div>
                  </div>
                );
              })
            ) : (
              /* If Medusa has NO categories (or API fails), show static fallbacks */
              <>
                <div className="col">
                  <div className="text-center position-relative border rounded pb-4">
                    <img src="/img/1.png" className="img-fluid rounded-3 p-3" alt="..." />
                    <div className="listing-card-body pt-0">
                      <h6 className="card-title mb-1 fs-14">Fresh Milk</h6>
                      <p className="card-text small text-success">Explore items</p>
                    </div>
                    <Link href={`/${countryCode}/listing`} className="stretched-link"></Link>
                  </div>
                </div>
                <div className="col">
                  <div className="text-center position-relative border rounded pb-4">
                    <img src="/img/2.png" className="img-fluid rounded-3 p-3" alt="..." />
                    <div className="listing-card-body pt-0">
                      <h6 className="card-title mb-1 fs-14">Vegetables</h6>
                      <p className="card-text small text-success">Explore items</p>
                    </div>
                    <Link href={`/${countryCode}/listing`} className="stretched-link"></Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 4. Bottom Banner Images */}
      <section className="bg-white">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-3 col-6">
              <Link href={`/${countryCode}/listing`}><img src="/img/slider1.jpg" className="img-fluid rounded-3" alt="Slider 1" /></Link>
            </div>
            <div className="col-md-3 col-6">
              <Link href={`/${countryCode}/listing`}><img src="/img/slider2.jpg" className="img-fluid rounded-3" alt="Slider 2" /></Link>
            </div>
            <div className="col-md-3 col-6">
              <Link href={`/${countryCode}/listing`}><img src="/img/slider3.jpg" className="img-fluid rounded-3" alt="Slider 3" /></Link>
            </div>
            <div className="col-md-3 col-6">
              <Link href={`/${countryCode}/listing`}><img src="/img/slider4.jpg" className="img-fluid rounded-3" alt="Slider 4" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Get the App Section */}
      <section id="app-section" className="bg-white py-5 mobile-app-section">
        <div className="container">
          <div className="bg-light rounded px-4 pt-4 px-md-4 pt-md-4 px-lg-5 pt-lg-5 pb-0">
            <div className="row justify-content-center align-items-center app-2 px-lg-4">
              <div className="col-md-7 px-lg-5">
                <div className="text-md-start text-center">
                  <h1 className="fw-bold mb-2 text-dark">Get the Eatsie app</h1>
                  <div className="m-0 text-muted">We will send you a link, open it on your phone to download the app</div>
                </div>
                <div className="my-4 me-lg-5">
                  <div className="input-group bg-white shadow-sm rounded-pill p-2">
                    <span className="input-group-text bg-white border-0"><i className="bi bi-phone pe-2"></i> +91 </span>
                    <input type="text" className="form-control bg-white border-0 ps-0 me-1" placeholder="Enter phone number" />
                    <button className="btn btn-warning rounded-pill py-2 px-4 border-0" type="button">Send app link</button>
                  </div>
                </div>
                <div className="text-md-start text-center mt-5 mt-md-1 pb-md-4 pb-lg-5">
                  <p className="mb-3">Download app from</p>
                  <a href="#"><img alt="Play Store" src="/img/play-store.svg" className="img-fluid mobile-app-icon" /></a>
                  <a href="#"><img alt="App Store" src="/img/app-store.svg" className="img-fluid mobile-app-icon" /></a>
                </div>
              </div>
              <div className="col-md-5 pe-lg-5 mt-3 mt-md-0 mt-lg-0">
                <img alt="Mobile App" src="/img/mobile-app.png" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}