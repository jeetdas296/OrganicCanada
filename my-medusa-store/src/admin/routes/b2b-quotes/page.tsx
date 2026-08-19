import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useVendorSidebar } from "../../hooks/useVendorSidebar"

export default function B2BQuotesPage() {
  useVendorSidebar()
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(true)

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const checkRes = await fetch("/admin/vendor-check")
        const checkData = await checkRes.json()
        const isAdmin = !checkData.is_vendor
        setIsSuperAdmin(isAdmin)

        const res = await fetch("/admin/b2b-quotes")
        const data = await res.json()
        
        console.log("[B2B DEBUG] API response:", data)
        console.log("[B2B DEBUG] quotes:", data.quotes)
        console.log("[B2B DEBUG] b2b_quotes:", data.b2b_quotes)
        console.log("[B2B DEBUG] draft_orders:", data.draft_orders)

        if (data.quotes) {
          setQuotes(data.quotes)
        } else if (data.b2b_quotes) {
          setQuotes(data.b2b_quotes)
        } else {
          toast.error("Failed to load B2B quotes.")
        }
      } catch (err) {
        toast.error("Failed to fetch B2B quotes.")
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
              <Table.HeaderCell>{isSuperAdmin ? "Amount" : "Your Subtotal"}</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quotes.map((quote) => (
              <Table.Row key={quote.id}>
                <Table.Cell className="font-medium">#{quote.display_id}</Table.Cell>
                <Table.Cell className="text-ui-fg-muted">{quote.email || "Unknown"}</Table.Cell>

                <Table.Cell className="font-medium">
                  {isSuperAdmin ? (
                    <span className="text-ui-fg-base">${((quote.total || 0)).toFixed(2)}</span>
                  ) : (
                    <span className="text-emerald-700">${((quote.total || 0)).toFixed(2)}</span>
                  )}
                </Table.Cell>

                <Table.Cell>
                  <Badge color="orange">Pending Review</Badge>
                </Table.Cell>

                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-x-2">
                    {isSuperAdmin && (
                      <Link to={`/draft-orders/${quote.id}`}>
                        <Button variant="transparent" size="small">
                          View Draft Order
                        </Button>
                      </Link>
                    )}
                    <Link to={quote.id}>
                      <Button variant="secondary" size="small">
                        {isSuperAdmin ? "Quote Chat 💬" : "View Details"}
                      </Button>
                    </Link>
                  </div>
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