import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Container, Heading, Table, Button, Input, toast, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Vendor = {
  id: string
  name: string
  email: string
  commission_rate: number
}

export default function VendorCommissionPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [rates, setRates] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [isVendorUser, setIsVendorUser] = useState(false)

  const load = async () => {
    try {
      // detect actor role
      const checkRes = await fetch("/admin/vendor-check")
      const checkData = await checkRes.json()
      setIsVendorUser(!!checkData?.is_vendor)

      // role-aware endpoint (returns own vendor for vendor user)
      const res = await fetch("/admin/vendors")
      const data = await res.json()

      const list: Vendor[] = data.vendors || []
      setVendors(list)

      const nextRates: Record<string, string> = {}
      list.forEach((v) => {
        nextRates[v.id] = String(v.commission_rate ?? 15)
      })
      setRates(nextRates)
    } catch {
      toast.error("Failed to load vendors")
    }
  }

  useEffect(() => {
    load()
  }, [])

  const update = async (id: string) => {
    if (isVendorUser) return // read-only for vendors

    const parsed = Number(rates[id])
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Rate must be between 0 and 100")
      return
    }

    setSaving((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/admin/vendors/${id}/commission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_rate: parsed }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || "Failed to update")
      } else {
        toast.success("Rate updated")
        await load()
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <Container className="p-8">
      <Heading className="mb-2">Vendor Commission Rates</Heading>
      <Text className="mb-6 text-ui-fg-subtle">
        {isVendorUser
          ? "You can view your commission rate. Only Super Admin can edit rates."
          : "Manage commission rates for all vendors."}
      </Text>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Vendor</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Rate (%)</Table.HeaderCell>
            {!isVendorUser && <Table.HeaderCell>Action</Table.HeaderCell>}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {vendors.map((v) => (
            <Table.Row key={v.id}>
              <Table.Cell>{v.name}</Table.Cell>
              <Table.Cell>{v.email}</Table.Cell>
              <Table.Cell className="w-44">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={rates[v.id] ?? ""}
                  onChange={(e) =>
                    setRates((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                  disabled={isVendorUser}
                />
              </Table.Cell>
              {!isVendorUser && (
                <Table.Cell>
                  <Button
                    variant="secondary"
                    onClick={() => update(v.id)}
                    isLoading={!!saving[v.id]}
                  >
                    Save
                  </Button>
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Commission Rates",
  icon: CurrencyDollar,
})