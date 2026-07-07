import { notFound } from "next/navigation";
import Link from "next/link";
import { listProducts } from "@lib/data/products";
import AddToCartAction from "./AddToCartAction";
import BundleIncludes from "./BundleIncludes";
import { convertToLocale } from "@lib/util/money"; // 🟢 IMPORT ADDED

type Props = {
params: Promise<{ countryCode: string; handle: string }>;
searchParams: Promise<{ variant?: string }>; // 🟢 ADDED: Read URL parameters
}

export default async function ProductDetailPage(props: Props) {
const params = await props.params;
const searchParams = await props.searchParams; // 🟢 ADDED: Await the searchParams

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

// 🟢 THE FIX: Determine the selected variant from the URL, or default to the first one
const selectedVariant = product.variants?.find((v: any) => v.id === searchParams.variant) || product.variants?.[0];

// 🟢 THE FIX: Check Stock Status of the exact selected variant
const inStock = selectedVariant?.manage_inventory === false ||
selectedVariant?.allow_backorder === true ||
(selectedVariant?.inventory_quantity || 0) > 0;

// 🟢 THE FIX: Calculate price based on the selected variant
const calculatedPriceObj = selectedVariant?.calculated_price;
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
            {/* 🟢 THE FIX: Dynamic Stock Badge */}
            {inStock ? (
              <span className="badge bg-success">In Stock</span>
            ) : (
              <span className="badge bg-danger">Out of Stock</span>
            )}
          </div>

          {/* 🟢 THE FIX: Variant Selector UI */}
          {product.variants && product.variants.length > 1 && (
            <div className="mb-4">
              <h6 className="fw-bold mb-2">Select Option:</h6>
              <div className="d-flex flex-wrap gap-2">
                {product.variants.map((variant: any) => (
                  <Link 
                    key={variant.id} 
                    href={`?variant=${variant.id}`} 
                    scroll={false}
                    className={`btn btn-sm ${selectedVariant?.id === variant.id ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                  >
                    {variant.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h6 className="fw-bold mb-2">Description</h6>
          <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
            {product.description || "No description provided."}
          </p>

          {/* Bundle Components Section */}
          <BundleIncludes productId={product.id} countryCode={params.countryCode} />

          {/* Our new Interactive Add To Cart Engine */}
          <AddToCartAction 
            variantId={selectedVariant?.id} 
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