import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PreviewPrice from "./price"
import ProductCardActions from "components/ProductCartActions"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  
  // 🛑 1. CRITICAL EMERGENCY GUARD: 
  // If the product object is corrupt or missing entirely, exit immediately
  if (!product || !product.handle) {
    return null
  }

  // 🛡️ 2. THE ERROR FIX: Safe execution wrapper for the pricing utility
  let cheapestPrice = null
  try {
    if (product) {
      const priceData = getProductPrice({
        product: product, // Make sure it's explicitly wrapped in an object
      })
      cheapestPrice = priceData?.cheapestPrice || null
    }
  } catch (priceError) {
    console.warn(`Could not calculate price for product: ${product.title}`, priceError)
    // Continues execution smoothly instead of throwing a red crash screen
  }

  return (
    <div className="col h-100" data-testid="product-wrapper">
      <div className="card shadow-sm border-0 h-100 position-relative">
        
        {/* Product Image */}
        <LocalizedClientLink href={`/products/${product.handle}`}>
          <img 
            src={product.thumbnail || '/img/1.png'} 
            className="card-img-top p-3 w-100" 
            alt={product.title} 
            style={{ objectFit: 'contain', height: '180px' }} 
          />
        </LocalizedClientLink>
        
        <div className="card-body pt-0 d-flex flex-column">
          
          {/* Product Title */}
          <LocalizedClientLink href={`/products/${product.handle}`} className="text-decoration-none text-dark">
            <h6 className="card-title fw-bold mb-1 text-truncate" data-testid="product-title">
              {product.title}
            </h6>
          </LocalizedClientLink>
          
          {/* Price Layout Area */}
          
          <ProductCardActions product={product} countryCode={region.toString()} />
          {/* Action Button */}
          <div className="mt-3">
             <LocalizedClientLink 
               href={`/products/${product.handle}`} 
               className="btn btn-outline-success btn-sm w-100 rounded-pill fw-bold"
             >
               View Product
             </LocalizedClientLink>
          </div>
          
        </div>
      </div>
    </div>
  )
}