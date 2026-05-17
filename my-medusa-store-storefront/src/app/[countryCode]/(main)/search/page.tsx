export const dynamic = 'force-dynamic';
import ProductCardActions from "components/ProductCartActions";

import Link from "next/link";
// ✅ 1. Import Medusa's pricing-aware fetcher instead of the raw SDK
import { listProducts } from "@lib/data/products"; 

type Props = {
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const countryCode = params.countryCode;
  
  const query = searchParams.q || "";
  let products: any[] = [];

  try {
    if (query) {
      // ✅ 2. Pass the countryCode so Medusa knows WHICH currency to calculate!
      const { response } = await listProducts({
        countryCode: params.countryCode,
        queryParams: { q: query },
      });
      
      products = response.products || [];
    }
  } catch (error) {
    console.error("Search failed:", error);
  }

  return (
    <>
      <div className="bg-success py-5">
        <div className="container text-center text-white">
          <h1 className="fw-bold mb-2">Search Results</h1>
          <p className="lead m-0 text-white-50">
            {query ? `Showing results for "${query}"` : "Enter a search term to find products."}
          </p>
        </div>
      </div>

      <div className="container py-5">
        {products.length > 0 ? (
          <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">
            {products.map((product: any) => {
              // ✅ 3. This will now successfully find the calculated_amount!
              const price = product.variants?.[0]?.calculated_price?.calculated_amount;
              
              return (
                <div className="col" key={product.id}>
                  <Link href={`/${params.countryCode}/products/${product.handle}`} className="text-decoration-none text-dark">
                    <div className="bg-white shadow-sm rounded-3 p-3 border h-100 product-card hover-shadow transition-all">
                      <div className="text-center mb-3">
                        <img 
                          src={product.thumbnail || '/img/1.png'} 
                          alt={product.title} 
                          className="img-fluid rounded"
                          style={{ height: "150px", objectFit: "contain" }}
                        />
                      </div>
                      <h6 className="fw-bold mb-1 text-truncate">{product.title}</h6>
                      <ProductCardActions product={product} countryCode={countryCode} />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="icofont-search-document text-muted display-1 mb-3"></i>
            <h3 className="fw-bold text-muted">No products found.</h3>
            <p className="text-muted">Try searching for something else like "Apple" or "Milk".</p>
          </div>
        )}
      </div>
    </>
  );
}