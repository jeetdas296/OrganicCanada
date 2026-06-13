import Link from 'next/link';
import { listProducts } from "@lib/data/products";
import ProductCardActions from "components/ProductCartActions"; 
import ListingSortDropdown from "components/ListingSortDropdown"; 
import { convertToLocale } from "@lib/util/money"; 

type Params = {
  params: Promise<{
    countryCode: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ListingPage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams; 
  
  const countryCode = params.countryCode;
  const sortBy = searchParams.sortBy || "created_at"; 
  
  // 🟢 1. Grab the type_id from the URL if the user clicked the dropdown
  const typeId = searchParams.type_id as string | undefined;

  let products = [];
  let pageTitle = "All Products"; // Default title

  try {
    // 🟢 2. Dynamically build the database query
    const queryParams: any = { limit: 100 };
    
    if (typeId) {
      // If a type is selected, tell Medusa to ONLY return products of that type
      queryParams.type_id = [typeId];
    }

    const { response } = await listProducts({
      countryCode: countryCode,
      queryParams: queryParams, // Pass our dynamic query
    });
    
    products = response.products || [];

    // 🟢 3. Make the UI feel like a dedicated page by updating the title!
    if (typeId && products.length > 0) {
      // Grab the type value (e.g., "Merch") from the first loaded product
      const typeValue = products[0].type?.value;
      if (typeValue) {
        pageTitle = typeValue;
      }
    }

    // Sort Execution
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

  } catch (error: any) {
    console.error("❌ Failed to fetch products:", error?.message || error.toString());
  }

  return (
    <section className="py-4 osahan-main-body min-vh-100">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            
            <div className="osahan-listing-title d-flex align-items-center mb-4">
              {/* 🟢 4. Render the dynamic title */}
              <h5 className="m-0 fw-bold">{pageTitle}</h5>
              <ListingSortDropdown /> 
            </div>

            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
              {products.length > 0 ? (
                products.map((product: any) => {
                  const priceData = product.variants?.[0]?.calculated_price;

                  return (
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
                  );
                })
              ) : (
                <div className="col-12 py-5 text-center bg-white rounded shadow-sm border">
                  <h5 className="text-muted mb-3">No products found for this type!</h5>
                  <Link href={`/${countryCode}/listing`} className="btn btn-success fw-bold">
                    View All Products
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}