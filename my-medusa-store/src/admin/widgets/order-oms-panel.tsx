import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { useState } from "react"

const OrderOMSPanel = ({ data }: { data: any }) => {
  const order = data
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const triggerFulfillment = async () => {
    setLoading(true)
    setMessage("")
    try {
      // ✅ FIX 1: Use 'id' instead of 'item_id'
      const res = await fetch(`/admin/orders/${order.id}/fulfillments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: order.items?.map((i: any) => ({
            id: i.id,              // ✅ Changed from item_id to id
            quantity: i.quantity,
          })),
          location_id: order.metadata?.stock_location_id,
        }),
      })
      if (res.ok) {
        setMessage("✅ Fulfillment triggered!")
        // Reload the page to show updated fulfillment status
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const err = await res.json()
        setMessage(`❌ ${err.message || "Fulfillment failed"}`)
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ✅ FIX 2: Navigate to Returns section properly
  const navigateToReturns = () => {
    // Use the Medusa Admin router to navigate
    window.location.href = `/app/orders/${order.id}/returns`
  }

  const statusColorMap: Record<string, "green" | "orange" | "red" | "grey"> = {
    completed: "green",
    pending: "orange",
    cancelled: "red",
    draft: "grey",
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">🏭 OMS Controls</Heading>
        <Badge color={statusColorMap[order.status] || "grey"}>
          {order.status?.toUpperCase()}
        </Badge>
      </div>

      <div className="px-6 py-4 space-y-3">
        <Text size="small" className="text-ui-fg-subtle">
          Order ID: <span className="font-mono text-xs">{order.id}</span>
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Channel: {order.sales_channel_id || "Default"}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Currency: {order.currency_code?.toUpperCase()}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Items: {order.items?.length || 0}
        </Text>
      </div>

      <div className="px-6 py-4 space-y-2">
        <Button
          variant="secondary"
          size="small"
          className="w-full"
          isLoading={loading}
          onClick={triggerFulfillment}
          disabled={order.status === "cancelled" || order.status === "draft"}
        >
          🚚 Trigger Fulfillment
        </Button>

        <Button
          variant="transparent"
          size="small"
          className="w-full text-red-500"
          onClick={navigateToReturns}
        >
          ↩️ Request Return
        </Button>
      </div>

      {message && (
        <div className="px-6 py-3 text-sm">{message}</div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderOMSPanel