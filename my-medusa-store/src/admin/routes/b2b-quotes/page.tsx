import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

export default function B2BQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch("/admin/draft-orders")
        const data = await res.json()
        
        const b2bQuotes = (data.draft_orders || []).filter(
          (order: any) => order.metadata?.is_b2b_quote === true
        )
        setQuotes(b2bQuotes.length > 0 ? b2bQuotes : data.draft_orders || [])
      } catch (err) {
        toast.error("Failed to load B2B quotes.")
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [])

  return (
    <Container className="p-8">
      <Heading className="mb-6">B2B Wholesale Quotes 🏢</Heading>
      
      {loading ? (
        <p className="text-ui-fg-muted">Loading quotes...</p>
      ) : quotes.length === 0 ? (
        <div className="py-8 text-center border rounded-lg border-ui-border-base bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle">No pending B2B quotes right now.</p>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Draft ID</Table.HeaderCell>
              <Table.HeaderCell>Customer Email</Table.HeaderCell>
              <Table.HeaderCell>Amount</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quotes.map((quote) => (
              <Table.Row key={quote.id}>
                <Table.Cell className="font-medium">#{quote.display_id}</Table.Cell>
                
                {/* 🟢 FIX 1: Look directly at quote.email instead of quote.cart.email */}
                <Table.Cell className="text-ui-fg-muted">{quote.email || "Unknown"}</Table.Cell>
                
                <Table.Cell className="font-medium">
                  {/* 🟢 FIX 2: Look directly at quote.total instead of quote.cart.total */}
                  ${((quote.total || 0) / 100).toFixed(2)}
                </Table.Cell>

                <Table.Cell>
                  <Badge color="orange">Pending Review</Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <a href={`/app/orders/${quote.id}`}>
                    <Button variant="secondary" size="small">
                      Review Quote
                    </Button>
                  </a>
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
  label: "B2B Quotes",
  icon: DocumentText,
})