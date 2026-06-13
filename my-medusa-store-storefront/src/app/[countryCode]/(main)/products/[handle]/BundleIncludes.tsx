import { getBundleComponents } from "@lib/data/bundles"
import Link from "next/link"

export default async function BundleIncludes({ 
  productId, 
  countryCode 
}: { 
  productId: string
  countryCode: string 
}) {
  const bundleData = await getBundleComponents(productId)

  if (!bundleData.is_bundle || !bundleData.components.length) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-light rounded-3 border border-success-subtle shadow-sm">
      <h6 className="fw-bold mb-3 text-success d-flex align-items-center gap-2">
        <i className="icofont-gift fs-5"></i>
        This Bundle Includes:
      </h6>
      
      {bundleData.bundle_description && (
        <p className="text-muted small mb-3">{bundleData.bundle_description}</p>
      )}

      <div className="d-flex flex-column gap-2">
        {bundleData.components.map((component) => (
          <Link 
            key={component.product_id}
            href={`/${countryCode}/products/${component.handle}`}
            className="text-decoration-none text-dark"
          >
            <div className="d-flex align-items-center gap-3 bg-white p-2 rounded shadow-sm border border-light transition hover-shadow">
              <div 
                className="bg-light rounded d-flex align-items-center justify-content-center" 
                style={{ width: '60px', height: '60px', overflow: 'hidden' }}
              >
                {component.thumbnail ? (
                  <img 
                    src={component.thumbnail} 
                    alt={component.title} 
                    className="img-fluid object-cover w-100 h-100" 
                  />
                ) : (
                  <i className="icofont-box text-muted fs-4"></i>
                )}
              </div>
              
              <div className="flex-grow-1 min-w-0">
                <h6 className="mb-0 fw-semibold text-truncate">{component.title}</h6>
              </div>
              
              <div className="pe-2 flex-shrink-0">
                <span className="badge bg-success rounded-pill px-3 py-2 fs-6">
                  {component.quantity}x
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
