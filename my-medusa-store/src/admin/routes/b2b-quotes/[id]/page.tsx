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
  Select,
} from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useVendorSidebar } from "../../../hooks/useVendorSidebar"

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

// ----------------------------------------------------
// VENDOR VIEW: Read-Only Vendor Details
// ----------------------------------------------------
function VendorQuoteDetails() {
  const params = useParams()
  const quoteId = params.id as string
  const currencyCode = "usd"

  const [conversation, setConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myVendorId, setMyVendorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [itemEdits, setItemEdits] = useState<Record<string, { quantity?: number; unit_price?: number }>>({})
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([])
  const [savingProposal, setSavingProposal] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false)

  const navigate = useNavigate()
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    })
  }

  const fetchQuote = async () => {
    try {
      const [quoteRes, convRes] = await Promise.all([
        fetch(`/admin/b2b-quotes/${quoteId}`),
        fetch(`/admin/b2b-quotes/${quoteId}/negotiation`)
      ])

      const quoteData = await quoteRes.json()
      if (quoteRes.ok && quoteData.quote) {
        setQuote(quoteData.quote)
        console.log("[B2B DEBUG VENDOR] quote metadata:", quoteData.quote?.metadata)
        console.log("[B2B DEBUG VENDOR] vendor statuses:", quoteData.quote?.metadata?.vendor_statuses)
        console.log("[B2B DEBUG VENDOR] vendor last sender:", quoteData.quote?.metadata?.vendor_last_sender)
      } else {
        setError(quoteData.message || quoteData.error || "Failed to load quote details")
      }

      if (convRes.ok) {
        const convData = await convRes.json()
        setConversation(convData.conversation)
        if (convData.vendor_id) {
          setMyVendorId(convData.vendor_id)
        }
      }
    } catch (err) {
      setError("Network error occurred while fetching quote")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
    const interval = setInterval(fetchQuote, 6000)
    return () => clearInterval(interval)
  }, [quoteId])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages?.length])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage }),
      })

      if (res.ok) {
        const json = await res.json()
        setConversation((prev: any) => {
          if (!prev) return { id: "new", status: "open", messages: [json.message] }
          return {
            ...prev,
            messages: [...(prev.messages || []), json.message],
          }
        })
        setNewMessage("")
        scrollToBottom()
        toast.success("Message sent")
      } else {
        toast.error("Failed to send message")
      }
    } catch (err) {
      toast.error("Error sending message")
    }
  }

  const handleVendorAction = async (action: "accept" | "reject") => {
    if (processingAction) return

    if (action === "reject") {
      const confirmReject = window.confirm("Are you sure you want to reject this proposal? You will not be able to send messages for this quote anymore.")
      if (!confirmReject) return
    }

    setProcessingAction(true)
    try {
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        toast.success(`Proposal ${action}ed`)
        await fetchQuote()
      } else {
        const errJson = await res.json().catch(() => ({}))
        toast.error(errJson.message || `Failed to ${action} proposal`)
      }
    } catch (err: any) {
      toast.error(`Error trying to ${action} proposal`)
    } finally {
      setProcessingAction(false)
    }
  }

  const handleSearchCatalog = async (query: string = "") => {
    setIsSearchingCatalog(true)
    try {
      const quoteIdParam = quoteId || ""
      const res = await fetch(
        `/admin/b2b-quotes/products?q=${encodeURIComponent(query)}&currency_code=${quote?.currency_code || "usd"}&quote_id=${encodeURIComponent(quoteIdParam)}`,
        {
          method: "GET",
          credentials: "include",
        }
      )
      const data = await res.json()
      setCatalogSearchResults(data.variants || [])
    } catch (e) {
      console.error("Failed to search catalog products:", e)
    } finally {
      setIsSearchingCatalog(false)
    }
  }

  const handleAddCatalogProduct = async (variant: any) => {
    setSavingProposal(true)
    try {
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items_to_add: [
            {
              variant_id: variant.variant_id,
              quantity: 1,
              unit_price: variant.unit_price,
              title: `${variant.product_title} — ${variant.variant_title}`,
            },
          ],
        }),
      })
      if (!res.ok) {
        throw new Error("Failed to add product to proposal")
      }
      await fetchQuote()
      setShowAddModal(false)
      toast.success("Product added to proposal draft")
    } catch (err: any) {
      console.error("Failed to add product to proposal:", err)
      toast.error(err.message || "Failed to add product")
    } finally {
      setSavingProposal(false)
    }
  }

  useEffect(() => {
    if (showAddModal && catalogSearchResults.length === 0) {
      handleSearchCatalog("")
    }
  }, [showAddModal])

  const handleSaveProposal = async () => {
    const items_to_update = Object.entries(itemEdits).map(([id, edits]) => ({
      id,
      ...edits,
    }))

    const items_to_remove = removedItemIds.map((id) => ({ id }))

    if (items_to_update.length === 0 && items_to_remove.length === 0) {
      toast.info("No modifications detected")
      return
    }

    setSavingProposal(true)
    try {
      const payload: any = {
        items_to_update: items_to_update.length > 0 ? items_to_update : undefined,
        items_to_remove: items_to_remove.length > 0 ? items_to_remove : undefined,
      }

      const res = await fetch(`/admin/b2b-quotes/${quoteId}/proposal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success("Proposal updated successfully")
        setItemEdits({})
        setRemovedItemIds([])

        await fetchQuote() // Refresh quote to get new items/subtotals

        if (json.messages && json.messages.length > 0) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [...json.messages] }
            return {
              ...prev,
              messages: [...(prev.messages || []), ...json.messages],
            }
          })
        } else if (json.message) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [json.message] }
            return {
              ...prev,
              messages: [...(prev.messages || []), json.message],
            }
          })
        }
      } else {
        const errJson = await res.json().catch(() => ({}))
        toast.error(errJson.message || "Failed to update Proposal")
      }
    } catch (err) {
      toast.error("Error updating proposal")
    } finally {
      setSavingProposal(false)
    }
  }

  const [isReopened, setIsReopened] = useState(false)
  const vendorStatuses = quote?.metadata?.vendor_statuses || {}
  const vendorLastSender = quote?.metadata?.vendor_last_sender || {}
  const myStatus = myVendorId ? vendorStatuses[myVendorId] : null
  const myLastSender = myVendorId ? vendorLastSender[myVendorId] : null
  const isRejected = myStatus === "REJECTED"

  const isGlobalLocked = ["ready_for_payment", "payment_pending", "paid", "completed", "accepted"].includes(
    quote?.metadata?.quote_status as string
  )

  const isInputsLocked = isGlobalLocked || ((myStatus === "ACCEPTED" || myStatus === "REJECTED") && !isReopened)

  const handleCancelProposal = () => {
    setItemEdits({})
    setRemovedItemIds([])
    setIsReopened(false)
  }

  if (loading && !quote) {
    return (
      <Container className="p-8 text-center">
        <p className="text-ui-fg-muted">Loading quote details...</p>
      </Container>
    )
  }

  if (error || !quote) {
    return (
      <Container className="p-8 text-center flex flex-col items-center gap-y-4">
        <Heading level="h2" className="text-ui-fg-error">Error</Heading>
        <p className="text-ui-fg-subtle">{error}</p>
        <Button variant="secondary" onClick={() => navigate("/b2b-quotes")}>
          Back to B2B Quotes
        </Button>
      </Container>
    )
  }

  const activeItems = (quote.items || []).filter(
    (i: any) => !removedItemIds.includes(i.id)
  )

  const isDirty = Object.keys(itemEdits).length > 0 || removedItemIds.length > 0
  const isLocked = quote.status !== "pending" && quote.status !== "negotiating"

  return (
    <Container className="p-8 flex flex-col gap-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-x-3 mb-2">
            <Heading level="h1" className="text-2xl font-bold">
              Quote #{quote.display_id}
            </Heading>
            <Badge color="green">Vendor Workspace</Badge>
          </div>
          <Text className="text-ui-fg-subtle mb-1">
            Created: {new Date(quote.created_at).toLocaleString()}
          </Text>
          <Text className="text-ui-fg-subtle">
            Customer: {quote.email || "Unknown"}
          </Text>
        </div>

        <div className="text-right bg-ui-bg-subtle border border-ui-border-base p-4 rounded-xl shadow-sm">
          <Text className="text-sm font-semibold text-ui-fg-muted mb-1 uppercase tracking-widest">
            Your Subtotal
          </Text>
          <Heading level="h2" className="text-2xl font-black text-emerald-700">
            ${(quote.vendor_subtotal || 0).toFixed(2)}
          </Heading>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading level="h2" className="text-lg font-semibold">
              Requested Products (Your Farm)
            </Heading>
            {!isInputsLocked && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowAddModal(true)}
              >
                ＋ Add Line Item
              </Button>
            )}
          </div>
          <div className="border border-ui-border-base rounded-xl overflow-hidden mb-4">
            <Table>
              <Table.Header>
                <Table.Row className="bg-ui-bg-subtle">
                  <Table.HeaderCell>Item</Table.HeaderCell>
                  <Table.HeaderCell className="text-center">Qty</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Unit ($)</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Subtotal</Table.HeaderCell>
                  {!isInputsLocked && <Table.HeaderCell></Table.HeaderCell>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activeItems.map((item: any) => {
                  const currentQty = itemEdits[item.id]?.quantity ?? item.quantity
                  const currentPrice = itemEdits[item.id]?.unit_price ?? Number(item.unit_price || 0)
                  const total = currentQty * currentPrice

                  return (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-x-3">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-10 h-10 object-contain rounded border border-ui-border-base bg-ui-bg-subtle"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
                              <span className="text-xs text-ui-fg-muted">No IMG</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <Text size="small" className="font-semibold">
                              {item.title} {item.vendor?.name ? `— ${item.vendor.name}` : ""}
                            </Text>
                            <Text size="xsmall" className="text-ui-fg-muted font-mono">
                              {item.variant?.sku ||
                                item.variant_title ||
                                item.variant?.title ||
                                "Standard SKU"}
                            </Text>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          type="number"
                          min={1}
                          disabled={isInputsLocked}
                          value={currentQty}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                quantity: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-16 text-center"
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={isInputsLocked}
                          value={currentPrice}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                unit_price: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-20 ml-auto"
                        />
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Text size="small" className="font-bold">
                          {formatMoney(total, currencyCode)}
                        </Text>
                      </Table.Cell>
                      {!isInputsLocked && (
                        <Table.Cell className="text-right">
                          <Button
                            variant="transparent"
                            size="small"
                            onClick={() =>
                              setRemovedItemIds((prev) => [...prev, item.id])
                            }
                            title="Remove Item from Proposal"
                          >
                            🗑️
                          </Button>
                        </Table.Cell>
                      )}
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div>
              {isInputsLocked && !isGlobalLocked && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setIsReopened(true)}
                >
                  Unlock to Counter
                </Button>
              )}
            </div>
            <div className="flex gap-x-2">
              <Button
                variant="secondary"
                size="large"
                disabled={!isDirty || isInputsLocked || savingProposal}
                onClick={handleCancelProposal}
              >
                Cancel Proposal
              </Button>
              <Button
                variant="primary"
                size="large"
                disabled={!isDirty || isInputsLocked || savingProposal}
                onClick={handleSaveProposal}
              >
                {savingProposal ? "Saving..." : "Save Proposal Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Conversation Section */}
        <div className="flex flex-col h-[500px] border border-ui-border-base rounded-xl overflow-hidden bg-ui-bg-subtle">
          <div className="bg-ui-bg-base border-b border-ui-border-base p-4">
            <Heading level="h2" className="text-lg font-bold">
              Customer ↔ Vendor Discussion
            </Heading>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-y-4"
          >
            {conversation?.messages?.length > 0 ? (
              conversation.messages.map((msg: any) => {
                const isMe = msg.sender_type === "admin"
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] rounded-xl p-4 shadow-sm ${isMe
                      ? "bg-ui-bg-interactive text-ui-fg-on-color self-end"
                      : "bg-ui-bg-base border border-ui-border-base self-start"
                      }`}
                  >
                    <Text
                      size="small"
                      className={`font-semibold mb-1 ${isMe ? "text-ui-fg-on-color" : "text-ui-fg-muted"
                        }`}
                    >
                      {isMe ? "You" : "Customer"}
                    </Text>
                    <Text className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.text}
                    </Text>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center">
                <Text className="text-ui-fg-muted">No messages yet. Send a message to the customer.</Text>
              </div>
            )}
          </div>
          <div className="p-4 bg-ui-bg-base border-t border-ui-border-base flex flex-col gap-y-3">
            {myVendorId && (
              <div className="flex items-center justify-between">
                <Text size="small" className="font-semibold">
                  Status: <Badge color={myStatus === "ACCEPTED" ? "green" : myStatus === "REJECTED" ? "red" : "blue"}>{myStatus || "NEGOTIATING"}</Badge>
                </Text>
                <div className="flex gap-x-2">
                  {myLastSender !== "admin" && myStatus !== "ACCEPTED" && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleVendorAction("accept")}
                      disabled={processingAction || isLocked}
                    >
                      Accept
                    </Button>
                  )}
                  {myStatus !== "REJECTED" && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleVendorAction("reject")}
                      disabled={processingAction || isLocked}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isRejected || isLocked ? (
              <div className="bg-ui-bg-subtle border border-ui-border-base text-ui-fg-muted p-3 rounded-xl text-center text-sm font-semibold">
                {isLocked ? "Negotiation is closed." : "Proposal rejected. Chat disabled."}
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Type your message to the customer..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="mb-1"
                  rows={3}
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  Send Message
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-ui-bg-base p-6 rounded-xl border border-ui-border-base shadow-sm">
        <div>
          <Heading level="h1" className="text-2xl font-bold">
            Draft Order #{quoteId.split("_")[1] || quoteId}
          </Heading>
          <Text size="small" className="text-ui-fg-muted mt-1">
            Status: <Badge color={isLocked ? "red" : "green"}>{isLocked ? "Read Only" : "Interactive"}</Badge>
          </Text>
        </div>
        <Button variant="secondary" onClick={() => navigate("/b2b-quotes")}>
          ← Back
        </Button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ui-bg-base w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-ui-border-base flex items-center justify-between">
              <Heading level="h2">Add Product to Proposal</Heading>
              <Button
                variant="transparent"
                size="small"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4 border-b border-ui-border-base flex gap-2">
              <Input
                type="text"
                placeholder="Search catalog by name or SKU..."
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchCatalog(catalogSearchQuery)
                }}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => handleSearchCatalog(catalogSearchQuery)}
                disabled={isSearchingCatalog}
              >
                {isSearchingCatalog ? "..." : "Search"}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-ui-bg-subtle">
              <div className="flex flex-col gap-y-3">
                {catalogSearchResults.length === 0 && !isSearchingCatalog ? (
                  <div className="text-center p-8 text-ui-fg-muted">
                    No products found. Use search to find catalog items.
                  </div>
                ) : (
                  catalogSearchResults.map((variant) => {
                    return (
                      <div
                        key={variant.variant_id}
                        className="bg-ui-bg-base p-3 rounded-lg border border-ui-border-base flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <Text className="font-semibold text-sm">
                            {variant.product_title}
                          </Text>
                          <Text className="text-xs text-ui-fg-muted font-mono">
                            {variant.variant_title} {variant.sku && `(${variant.sku})`}
                          </Text>
                          <div className="flex items-center gap-x-2 mt-1">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {formatMoney(variant.unit_price, currencyCode)}
                            </span>
                            {variant.inventory_quantity !== undefined && (
                              <span className="text-xs text-ui-fg-muted font-semibold">
                                In stock: {variant.inventory_quantity}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleAddCatalogProduct(variant)}
                          disabled={savingProposal}
                        >
                          + Add to Proposal
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}


// SUPER ADMIN VIEW: Interactive Negotiation Workspace
// ----------------------------------------------------
function AdminB2BQuoteDetailPage() {
  const params = useParams()
  const quoteId = params.id as string

  console.log("[B2B DEBUG ADMIN DETAIL] Rendered Admin Detail. params:", params);

  const navigate = useNavigate()

  const [conversation, setConversation] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [quoteStatus, setQuoteStatus] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")

  const [vendorTabs, setVendorTabs] = useState<any[]>([])
  const [targetVendorId, setTargetVendorId] = useState<string>("")

  const hasAdminProducts = proposal?.items?.some((item: any) => !item.vendor?.id)
  const myStatus = proposal?.metadata?.vendor_statuses?.["admin"]
  const myLastSender = proposal?.metadata?.vendor_last_sender?.["admin"]

  // Editable Line Item State
  const [itemEdits, setItemEdits] = useState<Record<string, { quantity?: number; unit_price?: number }>>({})
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([])
  // Shipping & Discount State
  const [shippingOptionId, setShippingOptionId] = useState<string>("")
  const [shippingPrice, setShippingPrice] = useState<number | undefined>(undefined)
  const [discountPercentage, setDiscountPercentage] = useState<number | undefined>(undefined)
  const [fixedDiscount, setFixedDiscount] = useState<number | undefined>(undefined)
  const [promotionCode, setPromotionCode] = useState<string>("")

  // Proposal Notes with smooth typing protection
  const [proposalNote, setProposalNote] = useState<string>("")
  const [noteDirty, setNoteDirty] = useState(false)
  const [savingProposal, setSavingProposal] = useState(false)

  // Modal / Popover state for adding line items from catalog
  const [showAddModal, setShowAddModal] = useState(false)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false)

  const noteDirtyRef = useRef(false)
  noteDirtyRef.current = noteDirty

  const chatScrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages?.length])

  const fetchNegotiationAndProposal = async () => {
    try {
      const [convRes, propRes] = await Promise.all([
        fetch(`/admin/b2b-quotes/${quoteId}/negotiation`),
        fetch(`/admin/b2b-quotes/${quoteId}/proposal`),
      ])

      if (convRes.ok) {
        const convJson = await convRes.json()
        setConversation(convJson.conversation)
        if (convJson.vendor_tabs) {
          setVendorTabs(convJson.vendor_tabs)
        }
      }

      if (propRes.ok) {
        const propJson = await propRes.json()
        setProposal(propJson.proposal)
        console.log("[B2B DEBUG ADMIN] quote metadata:", propJson.proposal?.metadata)
        console.log("[B2B DEBUG ADMIN] vendor statuses:", propJson.proposal?.metadata?.vendor_statuses)
        console.log("[B2B DEBUG ADMIN] vendor last sender:", propJson.proposal?.metadata?.vendor_last_sender)
        setIsLocked(propJson.is_locked || false)
        setQuoteStatus(propJson.quote_status || "pending")

        // Never overwrite proposalNote if the user is actively typing
        if (!noteDirtyRef.current) {
          setProposalNote(propJson.proposal?.metadata?.proposal_note || "")
        }

        if (propJson.proposal?.metadata?.b2b_discount_percentage !== undefined) {
          setDiscountPercentage(Number(propJson.proposal.metadata.b2b_discount_percentage))
        }
        if (propJson.proposal?.metadata?.b2b_fixed_discount !== undefined) {
          setFixedDiscount(Number(propJson.proposal.metadata.b2b_fixed_discount))
        }
      }
    } catch (err) {
      console.error("Failed to load full-page B2B quote workspace:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!quoteId) return

    fetchNegotiationAndProposal()
    const interval = setInterval(fetchNegotiationAndProposal, 6000)
    return () => clearInterval(interval)
  }, [quoteId])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const payload: any = { text: newMessage }
      if (targetVendorId) {
        payload.vendor_id = targetVendorId
      }

      const res = await fetch(`/admin/b2b-quotes/${quoteId}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = await res.json()
        setConversation((prev: any) => {
          if (!prev) return { id: "new", status: "open", messages: [json.message] }
          return {
            ...prev,
            messages: [...(prev.messages || []), json.message],
          }
        })
        setNewMessage("")
        scrollToBottom()
        toast.success("Message sent")
      } else {
        toast.error("Failed to send message")
      }
    } catch (err) {
      toast.error("Error sending message")
    }
  }

  const handleSearchCatalog = async (query: string = "") => {
    setIsSearchingCatalog(true)
    try {
      const quoteIdParam = quoteId || proposal?.id || ""
      const res = await fetch(
        `/admin/b2b-quotes/products?q=${encodeURIComponent(query)}&currency_code=${currencyCode}&quote_id=${encodeURIComponent(quoteIdParam)}`,
        {
          method: "GET",
          credentials: "include",
        }
      )
      const data = await res.json()
      setCatalogSearchResults(data.variants || [])
    } catch (e) {
      console.error("Failed to search catalog products:", e)
    } finally {
      setIsSearchingCatalog(false)
    }
  }

  const handleAddCatalogProduct = async (variant: any) => {
    setSavingProposal(true)
    try {
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items_to_add: [
            {
              variant_id: variant.variant_id,
              quantity: 1,
              unit_price: variant.unit_price,
              title: `${variant.product_title} — ${variant.variant_title}`,
            },
          ],
        }),
      })
      if (!res.ok) {
        throw new Error("Failed to add product to proposal")
      }
      await fetchNegotiationAndProposal()
      setShowAddModal(false)
      toast.success("Product added to proposal draft")
    } catch (err: any) {
      console.error("Failed to add product to proposal:", err)
      toast.error(err.message || "Failed to add product")
    } finally {
      setSavingProposal(false)
    }
  }

  useEffect(() => {
    if (showAddModal && catalogSearchResults.length === 0) {
      handleSearchCatalog("")
    }
  }, [showAddModal])

  const isDirty =
    Object.keys(itemEdits).length > 0 ||
    removedItemIds.length > 0 ||
    Boolean(shippingOptionId) ||
    promotionCode !== "" ||
    (noteDirty && proposalNote !== (proposal?.metadata?.proposal_note || ""))

  const handleSaveProposal = async () => {
    if (isLocked) {
      toast.error("Agreement is locked and read-only.")
      return
    }

    const items_to_update = Object.entries(itemEdits).map(([id, edits]) => ({
      id,
      ...edits,
    }))

    const items_to_remove = removedItemIds.map((id) => ({ id }))

    if (
      items_to_update.length === 0 &&
      items_to_remove.length === 0 &&
      !shippingOptionId &&
      !promotionCode &&
      discountPercentage === (proposal?.metadata?.b2b_discount_percentage ? Number(proposal.metadata.b2b_discount_percentage) : undefined) &&
      fixedDiscount === (proposal?.metadata?.b2b_fixed_discount ? Number(proposal.metadata.b2b_fixed_discount) : undefined) &&
      proposalNote === (proposal?.metadata?.proposal_note || "")
    ) {
      toast.info("No proposal modifications detected")
      return
    }

    setSavingProposal(true)
    try {
      const payload: any = {
        items_to_update: items_to_update.length > 0 ? items_to_update : undefined,
        items_to_remove: items_to_remove.length > 0 ? items_to_remove : undefined,
        shipping_option_id: shippingOptionId || undefined,
        shipping_price: shippingPrice !== undefined ? shippingPrice : undefined,
        promotion_code: promotionCode || undefined,
        discount_percentage: discountPercentage,
        fixed_discount: fixedDiscount,
        note: proposalNote,
      }

      const res = await fetch(`/admin/b2b-quotes/${quoteId}/proposal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success("Proposal Agreement updated successfully")
        setItemEdits({})
        setRemovedItemIds([])
        setShippingOptionId("")
        setPromotionCode("")
        setNoteDirty(false)
        noteDirtyRef.current = false
        if (json.order) {
          setProposal(json.order)
          setProposalNote(json.order?.metadata?.proposal_note || "")
        }
        if (json.messages && json.messages.length > 0) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [...json.messages] }
            return {
              ...prev,
              messages: [...(prev.messages || []), ...json.messages],
            }
          })
        } else if (json.message) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [json.message] }
            return {
              ...prev,
              messages: [...(prev.messages || []), json.message],
            }
          })
        }
      } else {
        const errJson = await res.json().catch(() => ({}))
        toast.error(errJson.message || "Failed to update Proposal Agreement")
      }
    } catch (err) {
      toast.error("Error updating proposal")
    } finally {
      setSavingProposal(false)
    }
  }

  const handleAdminVendorAction = async (action: "accept" | "reject") => {
    if (isLocked) return
    if (action === "reject") {
      const confirmReject = window.confirm("Are you sure you want to reject this proposal?")
      if (!confirmReject) return
    }
    try {
      setSavingProposal(true)
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, vendor_id: "admin" }),
      })
      if (res.ok) {
        toast.success(`Proposal ${action}ed`)
        await fetchNegotiationAndProposal()
      } else {
        const errJson = await res.json().catch(() => ({}))
        toast.error(errJson.message || `Failed to ${action} proposal`)
      }
    } catch (err) {
      toast.error(`Error ${action}ing proposal`)
    } finally {
      setSavingProposal(false)
    }
  }

  const handleCancelChanges = () => {
    setItemEdits({})
    setRemovedItemIds([])
    setShippingOptionId("")
    setPromotionCode("")
    setNoteDirty(false)
    noteDirtyRef.current = false
    setProposalNote(proposal?.metadata?.proposal_note || "")
    toast.info("Unsaved modifications discarded")
  }

  // Live total calculation with edits & discounts applied
  const activeItems = (proposal?.items || []).filter(
    (item: any) => !removedItemIds.includes(item.id)
  )

  const currencyCode = proposal?.currency_code || "USD"
  const shippingMethodName =
    proposal?.shipping_methods?.[0]?.name ||
    proposal?.shipping_methods?.[0]?.shipping_option?.name ||
    "Standard Shipping"

  const itemsSubtotal =
    activeItems.reduce((acc: number, item: any) => {
      const currentQty = itemEdits[item.id]?.quantity ?? item.quantity
      const currentPrice =
        itemEdits[item.id]?.unit_price ?? Number(item.unit_price || 0)
      return acc + currentQty * currentPrice
    }, 0)

  const calculatedShipping = Number(
    proposal?.shipping_subtotal ??
    proposal?.shipping_total ??
    proposal?.shipping_methods?.[0]?.subtotal ??
    proposal?.shipping_methods?.[0]?.total ??
    proposal?.shipping_methods?.[0]?.amount ??
    0
  )
  const shippingTax = Number(
    proposal?.shipping_tax_total ??
    proposal?.shipping_methods?.[0]?.tax_total ??
    0
  )
  const discountAmount =
    (discountPercentage ? (itemsSubtotal * discountPercentage) / 100 : 0) +
    (fixedDiscount || 0)

  const grandTotal = Math.max(0, itemsSubtotal + calculatedShipping + shippingTax - discountAmount)

  const renderMessageCard = (msg: any) => {
    const isProposalUpdate = msg.message_type === "proposal_update"
    const isAdmin = msg.sender_type === "admin"
    const isVendorScoped = !!msg.metadata?.vendor_id
    const vendorName = isVendorScoped ? (vendorTabs.find(t => t.id === msg.metadata.vendor_id)?.name || "Vendor") : ""

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
          <Text className="whitespace-pre-wrap font-mono text-xs leading-relaxed mb-2">
            {msg.text}
          </Text>
          {msg.proposal_diff && (
            <details className="mt-1 text-xs font-mono bg-ui-bg-base p-2 rounded border border-ui-border-base">
              <summary className="cursor-pointer text-ui-fg-interactive font-semibold">
                View Structured JSON Diff
              </summary>
              <pre className="mt-2 text-ui-fg-subtle overflow-x-auto">
                {JSON.stringify(msg.proposal_diff, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return (
      <div
        key={msg.id}
        className={`flex flex-col max-w-[85%] rounded-xl p-4 shadow-sm my-1 ${isAdmin
          ? "bg-ui-bg-interactive text-ui-fg-on-color self-end"
          : "bg-ui-bg-base border border-ui-border-base self-start"
          }`}
      >
        <div className="flex items-center gap-x-2 mb-1">
          <Text
            size="small"
            className={`font-semibold ${isAdmin ? "text-ui-fg-on-color" : "text-ui-fg-muted"
              }`}
          >
            {isAdmin ? "Wholesale Team (You)" : "Customer"}
          </Text>
          {isVendorScoped && (
            <Badge color={isAdmin ? "grey" : "orange"} size="small" className="text-[10px]">
              {vendorName} Thread
            </Badge>
          )}
        </div>
        <Text className="whitespace-pre-wrap text-sm leading-relaxed">
          {msg.text}
        </Text>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-ui-bg-base">
        <Text className="text-ui-fg-muted">
          Loading full-page B2B Quote Negotiation Workspace...
        </Text>
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] bg-ui-bg-subtle flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-ui-bg-base border-b border-ui-border-base px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-x-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate("/b2b-quotes")}
          >
            ← Back to B2B Quotes
          </Button>
          <div>
            <div className="flex items-center gap-x-3">
              <Heading level="h1" className="text-xl font-bold">
                B2B Quote Negotiation Workspace
              </Heading>
              <Badge color="blue">Quote #{quoteId.split("_")[1] || quoteId}</Badge>
              <Badge color={isLocked ? "red" : "green"}>
                {isLocked ? "🔒 Read Only — Customer Accepted" : "🟢 Interactive Negotiation"}
              </Badge>
              <Badge color="purple">Status: {quoteStatus}</Badge>
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Full-screen collaboration workspace • Gmail / Linear aesthetic
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-x-3">
          {isDirty && !isLocked && (
            <Badge color="orange" className="font-semibold">
              ⚠️ Unsaved Proposal Modifications
            </Badge>
          )}
          {targetVendorId === "" && hasAdminProducts && (
            <div className="flex items-center gap-x-2">
              <Text size="small" className="font-semibold text-ui-fg-muted mr-1">
                Status: <Badge color={myStatus === "ACCEPTED" ? "green" : myStatus === "REJECTED" ? "red" : "blue"}>{myStatus || "NEGOTIATING"}</Badge>
              </Text>
              {!isLocked && myStatus !== "ACCEPTED" && myLastSender !== "admin" && !isDirty && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleAdminVendorAction("accept")}
                  isLoading={savingProposal}
                >
                  Accept
                </Button>
              )}
              {!isLocked && myStatus !== "REJECTED" && !isDirty && (
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleAdminVendorAction("reject")}
                  isLoading={savingProposal}
                >
                  Reject
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Full Page 65% / 35% Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 flex-1 min-h-0 h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] overflow-hidden">

        {/* LEFT COLUMN (65%, 8 cols): Full Conversation Timeline & Version History */}
        <div className="lg:col-span-8 flex flex-col bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 shadow-sm h-full min-h-0 overflow-hidden">
          <div className="border-b border-ui-border-base pb-3 mb-4 flex items-center justify-between shrink-0">
            <div>
              <Heading level="h2" className="text-base font-bold">
                Conversation & Version History Timeline
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
                All messages, terms, and structured proposal diffs are recorded permanently.
              </Text>
            </div>
            <Badge color="grey">
              {conversation?.messages?.length || 0} Messages
            </Badge>
          </div>

          {/* Vendor Tabs for Super Admin */}
          {vendorTabs.length > 0 && (
            <div className="flex items-center gap-x-2 border-b border-ui-border-base pb-3 mb-3 shrink-0 overflow-x-auto custom-scrollbar">
              <Button
                variant={targetVendorId === "" ? "primary" : "secondary"}
                size="small"
                onClick={() => setTargetVendorId("")}
              >
                Wholesale Team (Main)
              </Button>
              {vendorTabs.map((tab: any) => (
                <Button
                  key={tab.id}
                  variant={targetVendorId === tab.id ? "primary" : "secondary"}
                  size="small"
                  onClick={() => setTargetVendorId(tab.id)}
                >
                  {tab.name}
                </Button>
              ))}
            </div>
          )}

          {/* Independent Scrollable Chat Timeline */}
          <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-y-3 pr-2 custom-scrollbar">
            {!conversation?.messages?.length ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-ui-fg-muted">
                <Text className="text-base font-semibold">
                  No discussion history yet.
                </Text>
                <Text size="small">
                  Send a message or update the proposal terms on the right to start collaborating.
                </Text>
              </div>
            ) : (
              conversation.messages
                .filter((msg: any) => {
                  if (targetVendorId === "") {
                    return !msg.metadata?.vendor_id || msg.message_type === "proposal_update"
                  }
                  return msg.metadata?.vendor_id === targetVendorId
                })
                .map(renderMessageCard)
            )}
          </div>

          {/* Chat Message Input Bar */}
          <div className="pt-4 border-t border-ui-border-base flex items-center gap-x-2 shrink-0">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message, terms, or response to customer..."
              className="flex-1"
              disabled={conversation?.status === "closed"}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage()
              }}
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || conversation?.status === "closed"}
            >
              Send Message
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN (35%, 4 cols): Interactive Commercial Proposal Agreement Editor */}
        <div className="lg:col-span-4 flex flex-col bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 shadow-sm h-full min-h-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-ui-border-base pb-4 mb-4 shrink-0">
            <div>
              <Heading level="h2" className="text-base font-bold">
                Proposal Agreement Editor
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
                Single source of truth Draft Order #{quoteId.split("_")[1] || quoteId}
              </Text>
            </div>
            {isLocked ? (
              <Badge color="red">Read Only</Badge>
            ) : (
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowAddModal(true)}
              >
                ＋ Add Line Item
              </Button>
            )}
          </div>

          {/* Line Items Table */}
          <div className="flex flex-col gap-y-4 mb-6">
            <div className="flex items-center justify-between">
              <Text size="small" className="font-bold">
                Line Items ({activeItems.length})
              </Text>
            </div>

            <div className="border border-ui-border-base rounded-xl overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row className="bg-ui-bg-subtle">
                    <Table.HeaderCell>Product & SKU</Table.HeaderCell>
                    <Table.HeaderCell>Qty</Table.HeaderCell>
                    <Table.HeaderCell>Unit ($)</Table.HeaderCell>
                    <Table.HeaderCell>Subtotal</Table.HeaderCell>
                    {!isLocked && <Table.HeaderCell></Table.HeaderCell>}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {activeItems.map((item: any) => {
                    const currentQty = itemEdits[item.id]?.quantity ?? item.quantity
                    const currentPrice =
                      itemEdits[item.id]?.unit_price ?? Number(item.unit_price || 0)
                    const total = currentQty * currentPrice

                    return (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <Text size="small" className="font-semibold">
                              {item.title} {item.vendor?.name ? `— ${item.vendor.name}` : ""}
                            </Text>
                            <Text size="xsmall" className="text-ui-fg-muted font-mono">
                              {item.variant?.sku ||
                                item.variant_title ||
                                item.variant?.title ||
                                "Standard SKU"}
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
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-16 text-center"
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
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  unit_price: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-20"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" className="font-bold">
                            {formatMoney(total, currencyCode)}
                          </Text>
                        </Table.Cell>
                        {!isLocked && (
                          <Table.Cell className="text-right">
                            <Button
                              variant="transparent"
                              size="small"
                              onClick={() =>
                                setRemovedItemIds((prev) => [...prev, item.id])
                              }
                              title="Remove Item from Proposal"
                            >
                              🗑️
                            </Button>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    )
                  })}

                  {/* No custom items - only catalog items added directly to Draft Order */}
                </Table.Body>
              </Table>
            </div>
          </div>

          {/* Shipping & Delivery Terms (from Draft Order) */}
          <div className="flex flex-col gap-y-2 mb-6 p-4 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
            <Text size="small" className="font-bold">
              Shipping & Delivery
            </Text>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-ui-bg-base p-3 rounded-lg border border-ui-border-base">
                <Text size="xsmall" className="text-ui-fg-muted font-semibold block mb-1">
                  Shipping Method
                </Text>
                <Text className="font-bold text-ui-fg-base">
                  {shippingMethodName}
                </Text>
              </div>
              <div className="bg-ui-bg-base p-3 rounded-lg border border-ui-border-base">
                <Text size="xsmall" className="text-ui-fg-muted font-semibold block mb-1">
                  Shipping Cost
                </Text>
                <Text className="font-bold text-ui-fg-base">
                  {formatMoney(calculatedShipping, currencyCode)}
                </Text>
              </div>
              <div className="bg-ui-bg-base p-3 rounded-lg border border-ui-border-base">
                <Text size="xsmall" className="text-ui-fg-muted font-semibold block mb-1">
                  Shipping Tax
                </Text>
                <Text className="font-bold text-ui-fg-base">
                  {formatMoney(shippingTax, currencyCode)}
                </Text>
              </div>
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Shipping method and cost are calculated directly from the Draft Order.
            </Text>
          </div>

          {/* Discount Editing Section */}
          <div className="flex flex-col gap-y-2 mb-6 p-4 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
            <Text size="small" className="font-bold">
              Discounts & Promotion Code
            </Text>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Text size="xsmall" className="text-ui-fg-muted mb-1">
                  Discount Percentage (%)
                </Text>
                <Input
                  type="number"
                  placeholder="0%"
                  disabled={isLocked}
                  value={discountPercentage ?? ""}
                  onChange={(e) =>
                    setDiscountPercentage(
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Text size="xsmall" className="text-ui-fg-muted mb-1">
                  Fixed Discount ({formatMoney(0, currencyCode).replace(/[0-9.,]/g, "").trim() || "$"})
                </Text>
                <Input
                  type="number"
                  placeholder="0.00"
                  disabled={isLocked}
                  value={fixedDiscount ?? ""}
                  onChange={(e) =>
                    setFixedDiscount(
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
            <div>
              <Text size="xsmall" className="text-ui-fg-muted mb-1">
                Promotion Code
              </Text>
              <Input
                placeholder="ENTER_PROMO_CODE"
                disabled={isLocked}
                value={promotionCode}
                onChange={(e) => setPromotionCode(e.target.value)}
              />
            </div>
          </div>

          {/* Proposal Notes (No Refresh Bug while typing!) */}
          <div className="flex flex-col gap-y-2 mb-6">
            <Text size="small" className="font-bold">
              Proposal Notes / Special Commercial Terms
            </Text>
            <Textarea
              disabled={isLocked}
              value={proposalNote}
              onChange={(e) => {
                setProposalNote(e.target.value)
                setNoteDirty(true)
                noteDirtyRef.current = true
              }}
              placeholder="Enter special payment terms, delivery notes, or rationale..."
              rows={3}
            />
            <Text size="xsmall" className="text-ui-fg-muted">
              Controlled component state • Zero polling re-renders while typing
            </Text>
          </div>

          {/* Sticky Live Total Summary Box */}
          <div className="mt-auto bg-ui-bg-subtle border border-ui-border-base p-4 rounded-xl flex flex-col gap-y-2 shadow-md">
            <div className="flex items-center justify-between text-sm">
              <Text className="text-ui-fg-muted">Items Subtotal:</Text>
              <Text className="font-semibold">{formatMoney(itemsSubtotal, currencyCode)}</Text>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Text className="text-ui-fg-muted">Shipping:</Text>
              <Text className="font-semibold">{formatMoney(calculatedShipping, currencyCode)}</Text>
            </div>
            {shippingTax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <Text className="text-ui-fg-muted">Shipping Tax:</Text>
                <Text className="font-semibold">{formatMoney(shippingTax, currencyCode)}</Text>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-700">
                <Text>Total Discounts:</Text>
                <Text className="font-semibold">-{formatMoney(discountAmount, currencyCode)}</Text>
              </div>
            )}
            <div className="border-t border-ui-border-base pt-2 flex items-center justify-between">
              <Text className="font-bold text-base">Proposal Grand Total:</Text>
              <Text className="text-xl font-black text-ui-fg-base">
                {formatMoney(grandTotal, currencyCode)}
              </Text>
            </div>

            {!isLocked ? (
              <div className="flex items-center gap-x-2 pt-3">
                {isDirty && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={savingProposal}
                    onClick={handleCancelChanges}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  className="flex-1"
                  isLoading={savingProposal}
                  onClick={handleSaveProposal}
                >
                  Save Proposal Changes & Notify
                </Button>
              </div>
            ) : (
              <div className="bg-ui-bg-base border border-ui-border-base p-3 rounded-lg text-center mt-2">
                <Text size="small" className="font-semibold text-ui-fg-muted">
                  🔒 Read Only — Accepted by Customer. Awaiting Checkout Payment.
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Line Item Modal / Popover */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-y-4">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <Heading level="h2" className="text-base font-bold">
                ＋ Add Product from Catalog
              </Heading>
              <Button
                variant="transparent"
                size="small"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="flex flex-col gap-y-4 max-h-[65vh]">
              {/* Search bar */}
              <div className="flex gap-x-2">
                <Input
                  placeholder="Search by product name, variant title, or SKU..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchCatalog(catalogSearchQuery)
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleSearchCatalog(catalogSearchQuery)}
                  disabled={isSearchingCatalog}
                >
                  {isSearchingCatalog ? "..." : "Search"}
                </Button>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px]">
                {isSearchingCatalog ? (
                  <div className="text-center py-8 text-ui-fg-muted text-sm font-semibold">
                    Searching product catalog...
                  </div>
                ) : catalogSearchResults.length === 0 ? (
                  <div className="text-center py-8 text-ui-fg-muted text-sm font-semibold">
                    No products found. Try searching for another product name or SKU.
                  </div>
                ) : (
                  catalogSearchResults.map((variant) => {
                    return (
                      <div
                        key={variant.variant_id}
                        className="flex items-center justify-between p-3 rounded-xl border border-ui-border-base hover:border-ui-border-strong transition-colors bg-ui-bg-base gap-x-3"
                      >
                        <img
                          src={variant.thumbnail}
                          alt={variant.product_title}
                          className="w-12 h-12 object-contain rounded-lg bg-ui-bg-subtle border border-ui-border-base shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <Text size="small" className="font-bold truncate">
                            {variant.product_title}
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-subtle truncate font-semibold">
                            {variant.variant_title}{" "}
                            {variant.sku && (
                              <span className="text-ui-fg-muted">
                                • SKU: {variant.sku}
                              </span>
                            )}
                          </Text>
                          <div className="flex items-center gap-x-2 mt-1">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {formatMoney(variant.unit_price, currencyCode)}
                            </span>
                            {variant.inventory_quantity !== undefined && (
                              <span className="text-xs text-ui-fg-muted font-semibold">
                                In stock: {variant.inventory_quantity}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleAddCatalogProduct(variant)}
                          disabled={savingProposal}
                        >
                          + Add to Proposal
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------
// SHARED ROUTE CONTROLLER (Role-Aware Router)
// ----------------------------------------------------
export default function B2BQuoteDetailPageWrapper() {
  useVendorSidebar()
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/admin/vendor-check")
        const data = await res.json()
        setIsSuperAdmin(!data.is_vendor)
      } catch (err) {
        console.error("Role check failed", err)
        // Fail-safe to vendor view if role check fails
        setIsSuperAdmin(false)
      }
    }
    checkRole()
  }, [])

  if (isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-ui-bg-base">
        <Text className="text-ui-fg-muted">Verifying secure access...</Text>
      </div>
    )
  }

  if (isSuperAdmin) {
    return <AdminB2BQuoteDetailPage />
  } else {
    return <VendorQuoteDetails />
  }
}
