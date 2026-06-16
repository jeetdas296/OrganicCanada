"use client"

import Image from "next/image"
import { convertToLocale } from "@lib/util/price-helper"

interface POSCartProps {
  items: any[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
}

export default function POSCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
}: POSCartProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )
  const tax = subtotal * 0.25 // 25% VAT for Denmark
  const total = subtotal + tax

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg h-full flex flex-col">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <h2 className="text-xl font-bold">Current Sale</h2>
        <p className="text-sm opacity-90">{items.length} item(s)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">Cart</p>
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
            >
              {item.thumbnail && (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  width={60}
                  height={60}
                  className="rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {item.title}
                </p>
                {/* ✅ Use convertToLocale for price */}
                <p className="text-sm font-bold text-blue-600">
                  {convertToLocale({
                    amount: item.unit_price,
                    currency_code: "eur",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded font-bold ml-2"
                >
                  X
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          {/* ✅ Use convertToLocale for subtotal */}
          <span className="font-semibold">
            {convertToLocale({ amount: subtotal, currency_code: "eur" })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT (25%):</span>
          {/* ✅ Use convertToLocale for tax */}
          <span className="font-semibold">
            {convertToLocale({ amount: tax, currency_code: "eur" })}
          </span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          {/* ✅ Use convertToLocale for total */}
          <span className="text-blue-600">
            {convertToLocale({ amount: total, currency_code: "eur" })}
          </span>
        </div>
      </div>
    </div>
  )
}