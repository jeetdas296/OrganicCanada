import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge, Checkbox, Input } from "@medusajs/ui"
import { useState, useEffect } from "react"

const OrderOMSPanel = ({ data }: { data: any }) => {
  const order = data
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  
  const [eligibilityData, setEligibilityData] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"organic_canada" | "manual">("organic_canada")

  useEffect(() => {
    fetchEligibility()
  }, [])

  const fetchEligibility = async () => {
    try {
      const res = await fetch(`/admin/oms/orders/${order.id}/fulfillment-eligibility`)
      if (res.ok) {
        const data = await res.json()
        setEligibilityData(data)
      } else {
        console.error("Failed to fetch eligibility")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (next[itemId]) {
        delete next[itemId]
      } else {
        next[itemId] = maxQty
      }
      return next
    })
  }

  const updateQuantity = (itemId: string, qty: number, maxQty: number) => {
    if (qty < 1) return
    if (qty > maxQty) qty = maxQty
    setSelectedItems(prev => ({ ...prev, [itemId]: qty }))
  }

  const triggerFulfillment = async () => {
    const itemsPayload = Object.entries(selectedItems).map(([id, quantity]) => ({
      item_id: id,
      quantity
    }))

    if (itemsPayload.length === 0) {
      setMessage("❌ Select at least one item")
      return
    }

    setLoading(true)
    setMessage("")
    try {
      const res = await fetch(`/admin/oms/orders/${order.id}/fulfillments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: itemsPayload, fulfillment_method: fulfillmentMethod }),
      })
      if (res.ok) {
        setMessage("✅ Fulfillment triggered!")
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

  if (!eligibilityData) {
    return (
      <Container className="p-6">
        <Text>Loading OMS Data...</Text>
      </Container>
    )
  }

  const hasEligibleItems = eligibilityData.eligible_items?.length > 0

  return (
    <div className="space-y-4">
      {/* ─── OMS CONTROLS ─── */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">🏭 OMS Fulfillment</Heading>
          {eligibilityData.is_vendor && (
            <Badge color="blue">Vendor Mode</Badge>
          )}
        </div>

        <div className="px-6 py-4 space-y-4">
          {hasEligibleItems ? (
            <div className="space-y-3">
              <Text size="small" weight="plus">Select items to fulfill:</Text>
              {eligibilityData.eligible_items.map((item: any) => {
                const isSelected = !!selectedItems[item.item_id]
                return (
                  <div key={item.item_id} className="flex items-center justify-between gap-4 p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.item_id, item.remaining_quantity)}
                      />
                      <div>
                        <Text size="small" weight="plus">{item.title}</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {item.vendor?.name} (Qty: {item.remaining_quantity})
                        </Text>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-20">
                        <Input 
                          type="number"
                          size="small"
                          min={1}
                          max={item.remaining_quantity}
                          value={selectedItems[item.item_id] || ""}
                          onChange={(e) => updateQuantity(item.item_id, parseInt(e.target.value) || 1, item.remaining_quantity)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle italic">
              No eligible items remaining to fulfill.
            </Text>
          )}
        </div>

        <div className="px-6 py-4 border-t space-y-3">
          <Text size="small" weight="plus">Fulfillment Method:</Text>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="fulfillment_method" 
                value="organic_canada" 
                checked={fulfillmentMethod === "organic_canada"}
                onChange={() => setFulfillmentMethod("organic_canada")}
                className="w-4 h-4"
              />
              <Text size="small">Organic Canada Logistics (PAL)</Text>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="fulfillment_method" 
                value="manual" 
                checked={fulfillmentMethod === "manual"}
                onChange={() => setFulfillmentMethod("manual")}
                className="w-4 h-4"
              />
              <Text size="small">Manual Shipping (Native Medusa)</Text>
            </label>
          </div>
        </div>

        <div className="px-6 py-4">
          <Button
            variant="secondary"
            size="small"
            className="w-full"
            isLoading={loading}
            onClick={triggerFulfillment}
            disabled={!hasEligibleItems || Object.keys(selectedItems).length === 0}
          >
            🚚 Fulfill Selected
          </Button>
        </div>

        {message && (
          <div className="px-6 py-3 text-sm font-medium">{message}</div>
        )}
      </Container>

      {/* ─── PAL SHIPMENTS ─── */}
      {eligibilityData.pal_shipments?.length > 0 && (
        <Container className="p-0">
          <div className="px-6 py-4 border-b">
            <Heading level="h2">🚚 PAL SHIPMENTS</Heading>
          </div>
          <div className="divide-y">
            {eligibilityData.pal_shipments.map((shipment: any) => {
              const bookings = shipment.bookings || []
              const activeBooking = bookings.length > 0 ? bookings[0] : null
              
              const isNotConfigured = activeBooking?.status === "NOT_BOOKED"

              return (
                <div key={shipment.id} className="p-6 space-y-3 bg-ui-bg-subtle">
                  <div className="flex justify-between items-start">
                    <Text weight="plus">Shipment: {shipment.id.split('_')[1] || shipment.id}</Text>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Text className="text-ui-fg-subtle">Medusa Fulfillment:</Text>
                    <Text weight="plus">CREATED</Text>

                    <Text className="text-ui-fg-subtle">PAL Shipment:</Text>
                    <Badge color="blue" className="w-fit">{shipment.status}</Badge>

                    <Text className="text-ui-fg-subtle">Provider:</Text>
                    <Text weight="plus">Organic Canada</Text>

                    <Text className="text-ui-fg-subtle">Carrier:</Text>
                    <Text weight="plus" className={isNotConfigured ? "text-orange-500" : ""}>
                      {isNotConfigured ? "NOT_CONFIGURED" : (activeBooking?.provider_id || "Unassigned")}
                    </Text>

                    <Text className="text-ui-fg-subtle">Booking:</Text>
                    <Text weight="plus">
                      {activeBooking?.status || "NOT_BOOKED"}
                    </Text>

                    {activeBooking?.external_tracking_id && (
                       <>
                         <Text className="text-ui-fg-subtle">Tracking:</Text>
                         <Text weight="plus">{activeBooking.external_tracking_id}</Text>
                       </>
                    )}
                  </div>
                  
                  {isNotConfigured && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <Text className="text-orange-800 text-sm flex items-center gap-2">
                        ⚠️ Carrier connection required
                      </Text>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Container>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderOMSPanel