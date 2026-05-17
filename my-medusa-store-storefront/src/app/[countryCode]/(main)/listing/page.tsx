import Link from 'next/link';
import { listProducts } from "@lib/data/products";
import ProductCardActions from "components/ProductCartActions"; 
import ListingSortDropdown from "components/ListingSortDropdown"; 

type Params = {
  params: Promise<{
    countryCode: string
  }>
  // 🛑 CRITICAL LOOKUP FIELD TYPE ASSIGNMENT:
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ListingPage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams; // ✅ Unpack the promise
  
  const countryCode = params.countryCode;
  const sortBy = searchParams.sortBy || "created_at"; // Safely catch parameters

  let products = [];
  try {
    const { response } = await listProducts({
      countryCode: countryCode,
      queryParams: { limit: 10000 },
    });
    products = response.products || [];

    // The Sorting Execution Array loop logic process block
    if (sortBy === "price_asc" || sortBy === "price_desc") {
      products.sort((a: any, b: any) => {
        const priceA = a.variants?.[0]?.calculated_price?.calculated_amount || 0;
        const priceB = b.variants?.[0]?.calculated_price?.calculated_amount || 0;
        return sortBy === "price_asc" ? priceA - priceB : priceB - priceA;
      });
    } else {
      products.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  return (
    <section className="py-4 osahan-main-body">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            
            <div className="osahan-listing-title d-flex align-items-center mb-4">
              <h5 className="m-0 fw-bold">All Products</h5>
              {/* Outputting our newly adjusted dropdown */}
              <ListingSortDropdown /> 
            </div>

            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
              {products.length > 0 ? (
                products.map((product: any) => (
                  <div className="col" key={product.id}>
                    <div className="card shadow-sm border-0 h-100 position-relative">
                      <Link href={`/${countryCode}/products/${product.handle}`}>
                        <img 
                          src={product.thumbnail || '/img/1.png'} 
                          className="card-img-top p-3" 
                          alt={product.title} 
                          style={{ objectFit: 'contain', height: '180px' }} 
                        />
                      </Link>
                      <div className="card-body pt-0 d-flex flex-column">
                        <Link href={`/${countryCode}/products/${product.handle}`} className="text-decoration-none text-dark">
                          <h6 className="card-title fw-bold mb-1 text-truncate">{product.title}</h6>
                        </Link>
                        <p className="card-text small text-muted mb-auto">Medusa Product</p>
                        <ProductCardActions product={product} countryCode={countryCode} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <p className="text-muted">No products found in the database.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}