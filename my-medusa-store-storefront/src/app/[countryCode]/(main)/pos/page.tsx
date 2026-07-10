"use client"

import { useState } from "react"
import ProductSearch from "@modules/pos/components/product-search"
import POSCart from "@modules/pos/components/pos-cart"
import PaymentSelector from "@modules/pos/components/payment-selector"
import OrderSummary from "@modules/pos/components/order-summary"
import { createPOSOrder } from "@lib/data/pos"

export default function POSPage() {
  const [cartItems, setCartItems] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobilepay">("card")
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddToCart = (item: any) => {
    const existingItem = cartItems.find(
      (i) => i.variant_id === item.variant_id
    )

    if (existingItem) {
      setCartItems(
        cartItems.map((i) =>
          i.variant_id === item.variant_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          ...item,
          id: item.variant_id + "-" + Date.now(),
          quantity: 1,
        },
      ])
    }
  }

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems(
      cartItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
  }

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError("Cart is empty")
      return
    }

    setLoading(true)
    setError(null)

    const result = await createPOSOrder({
      currency_code: "eur",
      items: cartItems.map(({ id, ...item }) => item),
      payment_method: paymentMethod,
      pos_terminal_id: "web-pos-copenhagen",
    })

    setLoading(false)

    if (result.success) {
      setCompletedOrder(result.data.order)
    } else {
      setError(result.error || "Failed to create order")
    }
  }

  const handleNewSale = () => {
    setCartItems([])
    setCompletedOrder(null)
    setError(null)
    setPaymentMethod("card")
  }

  const handleClearCart = () => {
    if (confirm("Clear the cart?")) {
      setCartItems([])
    }
  }

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      document.cookie = "pos_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">POS Terminal</h1>
            <p className="text-sm opacity-90">Copenhagen Store</p>
          </div>
          <div className="text-right flex items-center gap-6">
            <div>
              <p className="text-sm opacity-90">
                {new Date().toLocaleDateString("en-DK")}
              </p>
              <p className="text-lg font-semibold">
                {new Date().toLocaleTimeString("en-DK")}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4 text-gray-900">
              Search Products
            </h2>
            <ProductSearch onAddToCart={handleAddToCart} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <PaymentSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={handleClearCart}
                disabled={cartItems.length === 0 || loading}
                className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || loading}
                className="px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-lg"
              >
                {loading ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <POSCart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        </div>
      </div>

      {completedOrder && (
        <OrderSummary order={completedOrder} onNewSale={handleNewSale} />
      )}
    </div>
  )
}