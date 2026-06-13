import { notFound } from "next/navigation";
import Link from "next/link";
import { listProducts } from "@lib/data/products";
import AddToCartAction from "./AddToCartAction";
import BundleIncludes from "./BundleIncludes";
import { convertToLocale } from "@lib/util/money"; // 🟢 IMPORT ADDED

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

export default async function ProductDetailPage(props: Props) {
  const params = await props.params;
  
  // Fetch the specific product from Medusa
  const { response } = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  });

  const product = response.products[0];

  // If the product doesn't exist, throw a 404
  if (!product) {
    notFound();
  }

  // 🟢 THE FIX: Safely extract currency code and use Medusa's formatter
  const calculatedPriceObj = product.variants?.[0]?.calculated_price;
  const price = calculatedPriceObj?.calculated_amount 
    ? convertToLocale({ 
        amount: calculatedPriceObj.calculated_amount, 
        currency_code: calculatedPriceObj.currency_code || "eur" 
      }) 
    : "Price unavailable";

  return (
    <section className="py-5 osahan-main-body">
      <div className="container">
        <div className="row">
          
          {/* Left Side: Product Image */}
          <div className="col-lg-6">
            <div className="bg-white rounded-3 p-4 shadow-sm text-center h-100 d-flex align-items-center justify-content-center">
              <img 
                src={product.thumbnail || '/img/1.png'} 
                alt={product.title} 
                className="img-fluid rounded"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Right Side: Product Details */}
          <div className="col-lg-6">
            <div className="p-4 bg-white rounded-3 shadow-sm h-100">
              
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-2">
                  <li className="breadcrumb-item"><Link href={`/${params.countryCode}/listing`} className="text-success text-decoration-none">Home</Link></li>
                  <li className="breadcrumb-item"><Link href={`/${params.countryCode}/listing`} className="text-success text-decoration-none">Products</Link></li>
                  <li className="breadcrumb-item active" aria-current="page">{product.title}</li>
                </ol>
              </nav>

              <h2 className="fw-bold mb-3">{product.title}</h2>
              
              <div className="d-flex align-items-center mb-4">
                <h3 className="fw-bold text-success m-0 me-3">{price}</h3>
                <span className="badge bg-success">In Stock</span>
              </div>

              <h6 className="fw-bold mb-2">Description</h6>
              <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
                {product.description || "No description provided."}
              </p>

              {/* Bundle Components Section */}
              <BundleIncludes productId={product.id} countryCode={params.countryCode} />

              {/* Our new Interactive Add To Cart Engine */}
              <AddToCartAction 
                variantId={product.variants[0]?.id} 
                isPersonalizable={product.metadata?.is_personalizable === "true" || product.metadata?.is_personalizable === true}
              />

              <hr />

              <div className="d-flex align-items-center gap-4 text-muted small mt-3">
                <div><i className="icofont-truck text-success fs-5 align-middle me-1"></i> Fast Delivery</div>
                <div><i className="icofont-shield-alt text-success fs-5 align-middle me-1"></i> Quality Guarantee</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}