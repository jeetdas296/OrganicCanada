import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { useState, useEffect } from "react"

const POSDashboardWidget = () => {
  const [posOrders, setPosOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosOrders = async () => {
      try {
        const res = await fetch("/admin/orders?limit=50", {
          credentials: "include",
        })
        const data = await res.json()
        const filtered = (data.orders || []).filter(
          (o: any) => o.metadata?.source === "pos"
        )
        setPosOrders(filtered.slice(0, 5))
      } catch (err) {
        console.error("POS widget error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosOrders()
  }, [])

  const getPaymentColor = (method: string) => {
    const map: Record<string, "green" | "blue" | "orange"> = {
      cash: "green",
      card: "blue",
      gift_card: "orange",
    }
    return map[method] || ("grey" as any)
  }

  return (
    <Container className="divide-y p-0 mb-4">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏪</span>
          <Heading level="h2">Recent POS Orders</Heading>
        </div>
        <Badge color="blue">{posOrders.length} POS</Badge>
      </div>

      {loading ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle text-sm">Loading POS orders...</Text>
        </div>
      ) : posOrders.length === 0 ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle text-sm">
            No POS orders yet. Create a 'POS' Sales Channel and use POST /store/pos to start.
          </Text>
        </div>
      ) : (
        <div className="px-6 py-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ui-fg-subtle border-b text-left">
                <th className="py-2 pr-4">Order ID</th>
                <th className="py-2 pr-4">Terminal</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {posOrders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">
                    {order.id.slice(0, 12)}...
                  </td>
                  <td className="py-2 pr-4">
                    {order.metadata?.pos_terminal_id || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge
                      color={getPaymentColor(order.metadata?.payment_method)}
                    >
                      {order.metadata?.payment_method || "card"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    {order.currency_code?.toUpperCase()}{" "}
                    {((order.total || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default POSDashboardWidget