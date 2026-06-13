import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Table, Button, Badge, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

export default function VendorApprovalsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch the pending vendors when the page loads
  const fetchPendingVendors = async () => {
    try {
      const res = await fetch("/admin/pending-vendors")
      const data = await res.json()
      setVendors(data.vendors || [])
    } catch (err) {
      toast.error("Failed to load vendor applications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingVendors()
  }, [])

  // 2. Handle the approval click
  const handleApprove = async (vendorId: string, vendorName: string) => {
    try {
      const res = await fetch(`/admin/pending-vendors/${vendorId}/approve`, {
        method: "POST"
      })

      if (res.ok) {
        toast.success(`${vendorName} has been approved!`)
        // Remove them from the pending list
        setVendors((prev) => prev.filter((v) => v.id !== vendorId))
      }
    } catch (err) {
      toast.error("Failed to approve vendor.")
    }
  }

  return (
    <Container className="p-8">
      <Heading className="mb-6">Vendor Applications 🌾</Heading>
      
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

// 🟢 This block magically adds the page to the Medusa Sidebar!
export const config = defineRouteConfig({
  label: "Vendor Approvals",
  icon: BuildingStorefront,
})