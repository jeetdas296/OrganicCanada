import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  toast,
  Table,
  Badge,
  Textarea,
  FocusModal,
} from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"

type QuoteNegotiationProps = {
  draftOrderId: string
  isB2bQuote: boolean
}

export const QuoteNegotiation = ({ draftOrderId, isB2bQuote }: QuoteNegotiationProps) => {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [conversation, setConversation] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [quoteStatus, setQuoteStatus] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [itemEdits, setItemEdits] = useState<Record<string, { quantity?: number; unit_price?: number }>>({})
  const [proposalNote, setProposalNote] = useState<string>("")
  const [noteDirty, setNoteDirty] = useState(false)
  const [savingProposal, setSavingProposal] = useState(false)

  const noteDirtyRef = useRef(false)
  noteDirtyRef.current = noteDirty

  const fetchNegotiationAndProposal = async () => {
    try {
      const [convRes, propRes] = await Promise.all([
        fetch(`/admin/b2b-quotes/${draftOrderId}/negotiation`),
        fetch(`/admin/b2b-quotes/${draftOrderId}/proposal`),
      ])
      if (convRes.ok) {
        const convJson = await convRes.json()
        setConversation(convJson.conversation)
      }
      if (propRes.ok) {
        const propJson = await propRes.json()
        setProposal(propJson.proposal)
        setIsLocked(propJson.is_locked)
        setQuoteStatus(propJson.quote_status || "pending")
        // CRITICAL BUG FIX: Only set proposal note from server if the user is not actively typing/editing it!
        if (!noteDirtyRef.current) {
          setProposalNote(propJson.proposal?.metadata?.proposal_note || "")
        }
      }
    } catch (err) {
      console.error("Failed to fetch negotiation/proposal", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isB2bQuote) return

    fetchNegotiationAndProposal()

    // Poll every 5 seconds for live updates without overwriting user-typed notes
    const interval = setInterval(fetchNegotiationAndProposal, 5000)
    return () => clearInterval(interval)
  }, [isB2bQuote, draftOrderId])

  if (!isB2bQuote) {
    return null
  }

  const isDirty =
    Object.keys(itemEdits).length > 0 ||
    (noteDirty && proposalNote !== (proposal?.metadata?.proposal_note || ""))

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const res = await fetch(`/admin/b2b-quotes/${draftOrderId}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage }),
      })

      if (res.ok) {
        const json = await res.json()
        const newMsg = json.message

        setConversation((prev: any) => {
          if (!prev) return { id: "new", status: "open", messages: [newMsg] }
          return {
            ...prev,
            messages: [...(prev.messages || []), newMsg],
          }
        })
        setNewMessage("")
        toast.success("Message sent")
      } else {
        toast.error("Failed to send message")
      }
    } catch (err) {
      toast.error("Error sending message")
    }
  }

  const handleSaveProposal = async () => {
    if (isLocked) {
      toast.error("Agreement is locked and cannot be edited")
      return
    }

    const items_to_update = Object.entries(itemEdits).map(([id, edits]) => ({
      id,
      ...edits,
    }))

    if (
      items_to_update.length === 0 &&
      proposalNote === (proposal?.metadata?.proposal_note || "")
    ) {
      toast.info("No proposal changes detected")
      return
    }

    setSavingProposal(true)
    try {
      const res = await fetch(`/admin/b2b-quotes/${draftOrderId}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items_to_update,
          note: proposalNote,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success("Proposal Agreement updated!")
        // Reset dirty tracking
        setItemEdits({})
        setNoteDirty(false)
        noteDirtyRef.current = false

        // Optimistically synchronise proposal & append new version history message to chat
        if (json.order) {
          setProposal(json.order)
          setProposalNote(json.order?.metadata?.proposal_note || "")
        }
        if (json.message) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [json.message] }
            return {
              ...prev,
              messages: [...(prev.messages || []), json.message],
            }
          })
        }
      } else {
        const errJson = await res.json()
        toast.error(errJson.message || "Failed to update Proposal Agreement")
      }
    } catch (err) {
      toast.error("Error saving proposal")
    } finally {
      setSavingProposal(false)
    }
  }

  const handleCancelChanges = () => {
    setItemEdits({})
    setNoteDirty(false)
    noteDirtyRef.current = false
    setProposalNote(proposal?.metadata?.proposal_note || "")
    toast.info("Unsaved changes discarded")
  }

  const handleItemEditChange = (
    itemId: string,
    field: "quantity" | "unit_price",
    value: number
  ) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const renderMessageCard = (msg: any) => {
    const isProposalUpdate = msg.message_type === "proposal_update"
    const isAdmin = msg.sender_type === "admin"

    if (isProposalUpdate) {
      return (
        <div
          key={msg.id}
          className="flex flex-col w-full rounded-xl p-4 bg-ui-bg-subtle border border-ui-border-base my-2 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <Badge color="blue">
              📄 Proposal Updated ({isAdmin ? "Admin" : "Customer"})
            </Badge>
            <Text size="xsmall" className="text-ui-fg-muted font-mono">
              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}
            </Text>
          </div>
          <Text className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {msg.text}
          </Text>
        </div>
      )
    }

    return (
      <div
        key={msg.id}
        className={`flex flex-col max-w-[85%] rounded-xl p-3 shadow-sm ${
          isAdmin
            ? "bg-ui-bg-interactive text-ui-fg-on-color self-end"
            : "bg-ui-bg-base border border-ui-border-base self-start"
        }`}
      >
        <Text
          size="small"
          className={`font-semibold mb-1 ${
            isAdmin ? "text-ui-fg-on-color" : "text-ui-fg-muted"
          }`}
        >
          {isAdmin ? "Admin" : "Customer"}
        </Text>
        <Text className="whitespace-pre-wrap text-sm">{msg.text}</Text>
      </div>
    )
  }

  // Calculate live Grand Total with inline edits applied
  const calculatedTotal =
    proposal?.items?.reduce((acc: number, item: any) => {
      const currentQty = itemEdits[item.id]?.quantity ?? item.quantity
      const currentPrice =
        itemEdits[item.id]?.unit_price ?? Number(item.unit_price || 0)
      return acc + currentQty * currentPrice
    }, 0) || 0

  return (
    <Container className="p-4 mb-4 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-y-3">
        <div>
          <div className="flex items-center gap-x-2 mb-1">
            <Heading level="h2" className="text-base font-semibold">
              B2B Quote Negotiation & Proposal 💬
            </Heading>
            <Badge color={isLocked ? "red" : "green"}>
              {isLocked ? "🔒 Locked — Accepted" : "🟢 Interactive"}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Status: <span className="font-semibold">{quoteStatus}</span> • Total:{" "}
            <span className="font-semibold">
              ${Number(proposal?.total || 0).toFixed(2)}
            </span>
          </Text>
        </div>

        <div className="flex items-center gap-x-2">
          <a href={`/app/b2b-quotes/${draftOrderId}`}>
            <Button variant="primary" size="small">
              Open Full-Page Workspace 🚀
            </Button>
          </a>
          <FocusModal open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <FocusModal.Trigger asChild>
              <Button variant="secondary" size="small">
                Quick View
              </Button>
            </FocusModal.Trigger>
          <FocusModal.Content>
            <FocusModal.Header>
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-x-3">
                  <Heading className="text-lg font-bold">
                    B2B Commercial Proposal Workspace (#{draftOrderId})
                  </Heading>
                  <Badge color={isLocked ? "red" : "green"}>
                    {isLocked
                      ? "🔒 Agreement Locked — Customer Accepted Proposal"
                      : "🟢 Live Commercial Negotiation"}
                  </Badge>
                  <Badge color="blue">Status: {quoteStatus}</Badge>
                  {isDirty && !isLocked && (
                    <Badge color="orange">⚠️ Unsaved Changes</Badge>
                  )}
                </div>
              </div>
            </FocusModal.Header>

            <FocusModal.Body className="p-6 bg-ui-bg-subtle overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Text className="text-ui-fg-muted">
                    Loading commercial proposal agreement...
                  </Text>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                  {/* LEFT COLUMN (40%, 5 cols): Conversation & Version History */}
                  <div className="lg:col-span-5 flex flex-col gap-y-4 bg-ui-bg-base border border-ui-border-base rounded-xl p-5 shadow-sm h-[calc(100vh-140px)]">
                    <div className="border-b border-ui-border-base pb-3">
                      <Heading level="h2" className="text-base font-bold">
                        Conversation & Version History
                      </Heading>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        All discussion and proposal revisions are logged permanently.
                      </Text>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col gap-y-3 pr-1 custom-scrollbar">
                      {!conversation?.messages?.length ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-ui-fg-muted">
                          <Text>
                            No messages yet. Start the negotiation or update terms below!
                          </Text>
                        </div>
                      ) : (
                        conversation.messages.map(renderMessageCard)
                      )}
                    </div>

                    {conversation?.status === "closed" ? (
                      <div className="bg-ui-bg-subtle border border-ui-border-base text-ui-fg-muted p-3 rounded-md text-center">
                        <Text size="small">
                          Negotiation is closed for this order.
                        </Text>
                      </div>
                    ) : (
                      <div className="flex gap-x-2 pt-2 border-t border-ui-border-base">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type message or terms..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendMessage()
                          }}
                        />
                        <Button variant="secondary" onClick={handleSendMessage}>
                          Send
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN (60%, 7 cols): Live Commercial Proposal Agreement */}
                  <div className="lg:col-span-7 flex flex-col gap-y-6 bg-ui-bg-base border border-ui-border-base rounded-xl p-6 shadow-sm h-[calc(100vh-140px)] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
                      <div>
                        <Heading level="h2" className="text-lg font-bold">
                          Commercial Proposal Agreement
                        </Heading>
                        <Text size="small" className="text-ui-fg-muted">
                          Adjust line item quantities, unit prices, or terms.
                        </Text>
                      </div>
                      {isLocked ? (
                        <Text
                          size="small"
                          className="text-ui-fg-error font-semibold bg-red-50 px-3 py-1 rounded-md border border-red-200"
                        >
                          🔒 Read Only (Accepted by Customer)
                        </Text>
                      ) : isDirty ? (
                        <Badge color="orange">Unsaved Modifications</Badge>
                      ) : (
                        <Badge color="green">Up to Date</Badge>
                      )}
                    </div>

                    {/* Editable Product Table */}
                    <div className="overflow-x-auto border border-ui-border-base rounded-lg">
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>Product</Table.HeaderCell>
                            <Table.HeaderCell>Qty</Table.HeaderCell>
                            <Table.HeaderCell>Unit Price ($)</Table.HeaderCell>
                            <Table.HeaderCell>Item Total ($)</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {proposal?.items?.map((item: any) => {
                            const currentQty =
                              itemEdits[item.id]?.quantity ?? item.quantity
                            const currentPrice =
                              itemEdits[item.id]?.unit_price ??
                              Number(item.unit_price || 0)
                            const total = currentQty * currentPrice
                            return (
                              <Table.Row key={item.id}>
                                <Table.Cell>
                                  <div className="flex flex-col">
                                    <Text size="small" className="font-semibold">
                                      {item.title}
                                    </Text>
                                    <Text size="xsmall" className="text-ui-fg-muted">
                                      {item.variant_title ||
                                        item.variant?.title ||
                                        item.variant?.sku ||
                                        "Standard Variant"}
                                    </Text>
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <Input
                                    type="number"
                                    min={1}
                                    disabled={isLocked}
                                    value={currentQty}
                                    onChange={(e) =>
                                      handleItemEditChange(
                                        item.id,
                                        "quantity",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-20"
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    disabled={isLocked}
                                    value={currentPrice}
                                    onChange={(e) =>
                                      handleItemEditChange(
                                        item.id,
                                        "unit_price",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-24"
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="small" className="font-bold">
                                    ${total.toFixed(2)}
                                  </Text>
                                </Table.Cell>
                              </Table.Row>
                            )
                          })}
                        </Table.Body>
                      </Table>
                    </div>

                    {/* Inline Proposal Notes (No Refresh Bug while typing) */}
                    <div className="flex flex-col gap-y-2">
                      <Text size="small" className="font-semibold">
                        Proposal Notes & Special Terms
                      </Text>
                      <Textarea
                        disabled={isLocked}
                        value={proposalNote}
                        onChange={(e) => {
                          setProposalNote(e.target.value)
                          setNoteDirty(true)
                          noteDirtyRef.current = true
                        }}
                        placeholder="Enter special terms, delivery notes, or discount rationale..."
                        rows={3}
                      />
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Customer will see these terms on their quote proposal page.
                      </Text>
                    </div>

                    {/* Sticky Grand Total Summary Bar */}
                    <div className="mt-auto sticky bottom-0 bg-ui-bg-subtle border border-ui-border-base p-4 rounded-xl flex flex-col gap-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <Text className="font-bold text-base">
                          Proposal Grand Total
                        </Text>
                        <Text className="text-xl font-black text-ui-fg-base">
                          ${calculatedTotal.toFixed(2)}{" "}
                          {proposal?.currency_code?.toUpperCase() || "USD"}
                        </Text>
                      </div>

                      {!isLocked ? (
                        <div className="flex items-center gap-x-3">
                          {isDirty && (
                            <Button
                              variant="secondary"
                              className="flex-1"
                              disabled={savingProposal}
                              onClick={handleCancelChanges}
                            >
                              Cancel Changes
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            className="flex-1"
                            isLoading={savingProposal}
                            onClick={handleSaveProposal}
                          >
                            Save Proposal Changes & Notify Customer
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-ui-bg-base border border-ui-border-base p-3 rounded-lg text-center">
                          <Text size="small" className="font-semibold text-ui-fg-muted">
                            🔒 Agreement Locked — Accepted by Customer. Awaiting Payment.
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
        </div>
      </div>
    </Container>
  )
}
