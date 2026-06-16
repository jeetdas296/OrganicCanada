import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { useState, useEffect } from "react"

const InventoryDashboardWidget = () => {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [transferMode, setTransferMode] = useState(false)
  const [form, setForm] = useState({
    inventory_item_id: "",
    from_location_id: "",
    to_location_id: "",
    quantity: 1,
  })
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("/admin/inventory-locations", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLocations(d.inventory_locations || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleTransfer = async () => {
    setMsg("")
    const res = await fetch("/admin/inventory-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setMsg(res.ok ? "✅ Transferred " + form.quantity + " units!" : "❌ " + data.error)
    if (res.ok) setTransferMode(false)
  }

  const stockColor = (n: number): "green" | "orange" | "red" =>
    n > 20 ? "green" : n > 5 ? "orange" : "red"

  return (
    <Container className="divide-y p-0 mb-4">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏗️</span>
          <Heading level="h2">Inventory Locations</Heading>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setTransferMode(!transferMode)}
        >
          {transferMode ? "Cancel" : "🔄 Transfer Stock"}
        </Button>
      </div>

      {loading ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">Loading...</Text>
        </div>
      ) : locations.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            No locations found. Add them in Admin → Settings → Locations & Shipping.
          </Text>
        </div>
      ) : (
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc: any) => (
            <div
              key={loc.id}
              className="border rounded-lg p-3 space-y-2 bg-ui-bg-subtle"
            >
              <div className="flex items-center justify-between">
                <Text className="font-medium text-sm">{loc.name}</Text>
                <div className="flex gap-1">
                  {loc.is_pickup && (
                    <Badge color="blue" size="xsmall">📍 Pickup</Badge>
                  )}
                  {loc.is_warehouse && (
                    <Badge color="purple" size="xsmall">🏭 WH</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-xs text-ui-fg-subtle">
                <div className="flex justify-between">
                  <span>Available</span>
                  <Badge
                    color={stockColor(loc.inventory_summary?.total_available || 0)}
                    size="xsmall"
                  >
                    {loc.inventory_summary?.total_available || 0} units
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Reserved</span>
                  <span>{loc.inventory_summary?.total_reserved || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>SKUs</span>
                  <span>{loc.inventory_summary?.sku_count || 0}</span>
                </div>
              </div>
              {loc.sales_channels?.length > 0 && (
                <Text className="text-xs text-ui-fg-muted">
                  Channels: {loc.sales_channels.join(", ")}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      {transferMode && (
        <div className="px-6 py-4 space-y-3 bg-ui-bg-subtle border-t">
          <Text className="font-medium text-sm">Transfer Stock Between Locations</Text>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "inventory_item_id", label: "Inventory Item ID" },
              { key: "from_location_id", label: "From Location ID" },
              { key: "to_location_id", label: "To Location ID" },
              { key: "quantity", label: "Quantity", type: "number" },
            ].map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <Text className="text-xs text-ui-fg-subtle">{f.label}</Text>
                <input
                  type={f.type || "text"}
                  className="border rounded px-2 py-1 text-sm"
                  value={(form as any)[f.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
          <Button size="small" onClick={handleTransfer}>
            Confirm Transfer
          </Button>
          {msg && <Text className="text-sm">{msg}</Text>}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "inventory.list.before",  // ✅ This is the correct zone for Medusa v2
})

export default InventoryDashboardWidget