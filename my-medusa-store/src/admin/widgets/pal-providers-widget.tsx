import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Switch, Table, Button } from "@medusajs/ui"
import { useEffect, useState } from "react"

const PalProvidersWidget = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const loadData = () => {
    fetch("/admin/pal/providers")
      .then(res => res.json())
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load providers", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Container className="p-6">
        <Text>Loading providers...</Text>
      </Container>
    )
  }

  const provider = data?.provider || {
    id: "organic_canada",
    name: "Organic Canada Logistics",
    enabled: true,
    capabilities: ["PARCEL", "LTL", "FTL", "AIR_FREIGHT", "OCEAN_LCL", "OCEAN_FCL"]
  }

  const carriers = data?.carriers || []

  const handleProviderToggle = (val: boolean) => {
    setSaving(true)
    setErrorMsg("")
    fetch("/admin/pal/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: val })
    })
      .then(res => res.json())
      .then(() => {
        loadData()
        setSaving(false)
      })
      .catch(err => {
        setErrorMsg("Failed to save provider settings")
        setSaving(false)
      })
  }

  const handleCarrierToggle = (carrierId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "DISABLED" ? "NOT_CONFIGURED" : "DISABLED"
    setSaving(true)
    setErrorMsg("")
    fetch("/admin/pal/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configuration: {
          carriers: {
            [carrierId]: { status: nextStatus }
          }
        }
      })
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw e })
        return res.json()
      })
      .then(() => {
        loadData()
        setSaving(false)
      })
      .catch(err => {
        setErrorMsg(err.message || "Failed to save carrier settings")
        setSaving(false)
      })
  }

  const handleTestConnection = (carrierId: string) => {
    if (testingId) return // Prevent double clicks
    
    setTestingId(carrierId)
    setErrorMsg("")
    
    fetch("/admin/pal/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configuration: {
          carriers: {
            [carrierId]: { action: "test", options: {} }
          }
        }
      })
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw e })
        return res.json()
      })
      .then(() => {
        loadData()
        setTestingId(null)
      })
      .catch(err => {
        setErrorMsg(err.message || `Failed to test connection for ${carrierId}`)
        setTestingId(null)
      })
  }

  return (
    <Container className="p-6">
      <Heading className="mb-4">PAL Fulfillment Providers</Heading>
      <Text className="text-ui-fg-subtle mb-6">Manage configured logistics and freight providers for Organic Canada's multi-carrier framework.</Text>
      
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded border border-red-200 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="mb-8 border-b pb-6">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h2" className="text-lg">{provider.name}</Heading>
          <Switch 
            checked={provider.enabled} 
            onCheckedChange={handleProviderToggle}
            disabled={saving}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {provider.capabilities.map((m: string) => (
            <Badge key={m} size="small" color="blue">{m}</Badge>
          ))}
        </div>
      </div>

      <Heading level="h3" className="text-sm font-semibold mb-4">Underlying Carrier Connections</Heading>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Carrier</Table.HeaderCell>
            <Table.HeaderCell>Connection Status</Table.HeaderCell>
            <Table.HeaderCell>Active</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {carriers.map((c: any) => (
            <Table.Row key={c.id}>
              <Table.Cell className="font-semibold">{c.name}</Table.Cell>
              <Table.Cell>
                <Badge size="small" color={c.status === "CONNECTED" ? "green" : c.status === "DISABLED" ? "red" : "grey"}>
                  {c.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Switch 
                  checked={c.status !== "DISABLED"} 
                  disabled={saving || c.status === "CONNECTED"}
                  onCheckedChange={() => handleCarrierToggle(c.id, c.status)}
                />
              </Table.Cell>
              <Table.Cell>
                {(c.id === "shiprocket" || c.id === "dhl") && (
                  <Button 
                    size="small" 
                    variant="secondary"
                    onClick={() => handleTestConnection(c.id)}
                    disabled={testingId !== null}
                    isLoading={testingId === c.id}
                  >
                    {testingId === c.id ? "Testing..." : "Test Connection"}
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default PalProvidersWidget
