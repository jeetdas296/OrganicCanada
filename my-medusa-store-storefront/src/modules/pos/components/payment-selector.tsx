"use client"

interface PaymentSelectorProps {
  selected: "cash" | "card" | "mobilepay"
  onSelect: (method: "cash" | "card" | "mobilepay") => void
}

export default function PaymentSelector({
  selected,
  onSelect,
}: PaymentSelectorProps) {
  const methods = [
    { id: "card", label: "💳 Card", icon: "💳" },
    { id: "cash", label: "💵 Cash", icon: "💵" },
    { id: "mobilepay", label: "📱 MobilePay", icon: "📱" },
  ] as const

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Payment Method
      </label>
      <div className="grid grid-cols-3 gap-3">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`p-4 rounded-lg border-2 font-semibold transition-all ${
              selected === method.id
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            <div className="text-3xl mb-1">{method.icon}</div>
            <div className="text-sm">{method.label.replace(/.*\s/, "")}</div>
          </button>
        ))}
      </div>
    </div>
  )
}