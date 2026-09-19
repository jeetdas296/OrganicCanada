import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useVendorSidebar } from "../../hooks/useVendorSidebar"

const formatMoney = (amount: number, currencyCode: string = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

const ShippingPage = () => {
  useVendorSidebar()
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await fetch("/admin/oms/shipping")
        const data = await res.json()
        setShipments(data.shipments || [])
      } catch (err) {
        console.error("Failed to load shipments", err)
      } finally {
        setLoading(false)
      }
    }
    fetchShipments()
  }, [])

  return (
    <Container className="p-0 border shadow-none bg-ui-bg-base rounded-lg h-full overflow-hidden flex flex-col">
      <div className="p-6 border-b flex justify-between items-center">
        <Heading level="h1">Shipping Management</Heading>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order ID</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Trade</Table.HeaderCell>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Qty</Table.HeaderCell>
              <Table.HeaderCell>Price</Table.HeaderCell>
              <Table.HeaderCell>Provider</Table.HeaderCell>
              <Table.HeaderCell>Carrier</Table.HeaderCell>
              <Table.HeaderCell>Mode</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row>
                <Table.Cell colSpan={10} className="text-center py-10 text-ui-fg-muted">
                  Loading shipments...
                </Table.Cell>
              </Table.Row>
            ) : shipments.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={10} className="text-center py-10 text-ui-fg-muted">
                  No shipments found
                </Table.Cell>
              </Table.Row>
            ) : (
              shipments.map((shipment) => (
                <Table.Row key={shipment.id}>
                  <Table.Cell>
                    <Link to={`/shipping/${shipment.id}`} className="text-ui-fg-interactive hover:underline">
                      {shipment.order_id}
                    </Link>
                  </Table.Cell>
                  <Table.Cell><Badge>{shipment.order_type}</Badge></Table.Cell>
                  <Table.Cell><Badge color="blue">{shipment.trade_type}</Badge></Table.Cell>
                  <Table.Cell className="truncate max-w-[200px]" title={shipment.products}>{shipment.products}</Table.Cell>
                  <Table.Cell>{shipment.quantity}</Table.Cell>
                  <Table.Cell>{formatMoney(shipment.price, shipment.currency || "USD")}</Table.Cell>
                  <Table.Cell>{shipment.provider === "organic_canada" ? "Organic Canada" : shipment.provider}</Table.Cell>
                  <Table.Cell>{shipment.carrier ? shipment.carrier.toUpperCase() : "—"}</Table.Cell>
                  <Table.Cell>{shipment.transport_mode}</Table.Cell>
                  <Table.Cell>
                    <Badge color={shipment.status === "CREATED" ? "orange" : "green"}>{shipment.status}</Badge>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Shipping",
  icon: "Truck",
})

export default ShippingPage
