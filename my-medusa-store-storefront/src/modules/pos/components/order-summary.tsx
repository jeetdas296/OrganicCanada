"use client"

interface OrderSummaryProps {
  order: {
    id: string
    total?: number | string | null
    currency_code?: string
    items?: Array<{
      title: string
      quantity: number
      unit_price: number | string
    }>
    metadata?: {
      payment_method?: string
    }
  }
  onNewSale: () => void
}

const toNumber = (val: unknown): number => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (amountInMinor: number, currency = "eur") => {
  return new Intl.NumberFormat("en-DK", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInMinor)
}

export default function OrderSummary({ order, onNewSale }: OrderSummaryProps) {
  const handlePrint = () => {
    window.print()
  }

  const currency = (order.currency_code || "eur").toLowerCase()

  const computedItemsTotal = (order.items || []).reduce((sum, item) => {
    return sum + toNumber(item.unit_price) * toNumber(item.quantity)
  }, 0)

  // Prefer API total if valid, otherwise fallback to computed line-item total
  const safeTotal = toNumber(order.total) > 0 ? toNumber(order.total) : computedItemsTotal

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-green-600 text-white p-6 text-center">
          <div className="text-6xl mb-2">✓</div>
          <h2 className="text-2xl font-bold">Order Complete!</h2>
          <p className="text-sm opacity-90 mt-1">Transaction successful</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono text-lg font-bold text-gray-900">
              #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-4 space-y-2">
            {(order.items || []).map((item, idx) => {
              const lineTotal = toNumber(item.unit_price) * toNumber(item.quantity)
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantity}x {item.title}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(lineTotal, currency)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600">{formatMoney(safeTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Payment Method:</span>
              <span className="capitalize">{order.metadata?.payment_method || "Card"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={handlePrint}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={onNewSale}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              New Sale
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 pt-2">
            {new Date().toLocaleString("en-DK")}
          </p>
        </div>
      </div>
    </div>
  )
}