"use client"

import { useState } from "react"
import { searchProducts } from "@lib/data/pos"
import { getVariantPrice } from "@lib/util/price-helper"
import Image from "next/image"
import QRScannerModal from "@modules/pos/components/qr-scanner-modal"

interface ProductSearchProps {
  onAddToCart: (item: any) => void
}

export default function ProductSearch({ onAddToCart }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const handleSearch = async () => {
  if (!query.trim()) return
  setLoading(true)
  setError(null)
  
  // ✅ searchProducts now handles region internally
  const result = await searchProducts(query)
  
  if (result.success) {
    setProducts(result.products)
    if (result.products.length === 0) {
      setError("No products found")
    }
  } else {
    setError(result.error || "Search failed")
  }
  setLoading(false)
}

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // ✅ Use the helper function to get price info
  const getPriceInfo = (variant: any) => {
    return getVariantPrice(variant)
  }

  const handleAddProduct = (product: any, variant: any) => {
    // ✅ Use the helper to get the correct price
    const { amount, currencyCode } = getVariantPrice(variant)

    console.log("Adding to cart:", {
      product: product.title,
      variant: variant.id,
      amount,
      currency: currencyCode,
    })

    onAddToCart({
      variant_id: variant.id,
      title:
        product.title +
        (variant.title !== "Default" ? " - " + variant.title : ""),
      unit_price: amount,
      thumbnail: product.thumbnail,
      sku: variant.sku,
    })

    setQuery("")
    setProducts([])
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Search products by name or SKU..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {loading ? "..." : "Search"}
        </button>
        <button
          onClick={() => setIsScannerOpen(true)}
          type="button"
          className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span>Scan QR</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
          {error}
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {products.map((product: any) =>
            product.variants.map((variant: any) => {
              const { formatted } = getPriceInfo(variant)

              return (
                <button
                  key={variant.id}
                  onClick={() => handleAddProduct(product, variant)}
                  className="w-full p-3 hover:bg-blue-50 text-left flex items-center gap-3 border-b"
                >
                  {product.thumbnail && (
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      width={50}
                      height={50}
                      className="rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {product.title}
                      {variant.title !== "Default" && (
                        <span className="text-sm text-gray-600">
                          {" "}
                          - {variant.title}
                        </span>
                      )}
                    </p>
                    {variant.sku && (
                      <p className="text-xs text-gray-500">
                        SKU: {variant.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {/* ✅ Display formatted price */}
                    <p className="font-bold text-lg text-gray-900">
                      {formatted}
                    </p>
                    <p className="text-xs text-green-600">Add</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddToCart={onAddToCart}
      />
    </div>
  )
}