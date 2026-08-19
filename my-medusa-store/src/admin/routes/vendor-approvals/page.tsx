import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Table, Button, Badge, toast, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useVendorSidebar } from "../../hooks/useVendorSidebar"

type PendingVendor = {
  id: string
  name: string
  email: string
  created_at: string
}

export default function VendorApprovalsPage() {
  useVendorSidebar()
  const [vendors, setVendors] = useState<PendingVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState<Record<string, string>>({})

  const fetchPendingVendors = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/pending-vendors")
      const data = await res.json()
      const list: PendingVendor[] = data.vendors || []
      setVendors(list)

      const initialRates: Record<string, string> = {}
      list.forEach((v) => (initialRates[v.id] = "15"))
      setRates(initialRates)
    } catch {
      toast.error("Failed to load vendor applications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingVendors()
  }, [])

  const handleApprove = async (vendorId: string, vendorName: string) => {
    const parsedRate = Number(rates[vendorId])

    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      toast.error("Commission rate must be between 0 and 100")
      return
    }

    try {
      const res = await fetch(`/admin/pending-vendors/${vendorId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_rate: parsedRate }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || "Failed to approve vendor.")
        return
      }

      toast.success(`${vendorName} approved with ${parsedRate}% commission`)
      setVendors((prev) => prev.filter((v) => v.id !== vendorId))
    } catch {
      toast.error("Failed to approve vendor.")
    }
  }

  return (
    <Container className="p-8">
      <Heading className="mb-6">Vendor Applications</Heading>

      {loading ? (
        <p className="text-ui-fg-muted">Loading applications...</p>
      ) : vendors.length === 0 ? (
        <div className="py-8 text-center border rounded-lg border-ui-border-base bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle">You're all caught up! No pending applications.</p>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Farm Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Applied On</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Commission (%)</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vendors.map((vendor) => (
              <Table.Row key={vendor.id}>
                <Table.Cell className="font-medium">{vendor.name}</Table.Cell>
                <Table.Cell className="text-ui-fg-muted">{vendor.email}</Table.Cell>
                <Table.Cell className="text-ui-fg-muted">
                  {new Date(vendor.created_at).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <Badge color="orange">Pending Review</Badge>
                </Table.Cell>
                <Table.Cell className="w-40">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={rates[vendor.id] ?? "15"}
                    onChange={(e) =>
                      setRates((prev) => ({ ...prev, [vendor.id]: e.target.value }))
                    }
                  />
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleApprove(vendor.id, vendor.name)}
                  >
                    Approve
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Vendor Approvals",
  icon: BuildingStorefront,
})