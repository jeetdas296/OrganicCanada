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

export default function B2BQuoteDetailPage() {
  const params = useParams()
  const quoteId = params.id as string
  const navigate = useNavigate()

  const [conversation, setConversation] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [quoteStatus, setQuoteStatus] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")

  const adminOfferApproved = proposal?.metadata?.admin_offer_approved === true

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
      }

      if (propRes.ok) {
        const propJson = await propRes.json()
        setProposal(propJson.proposal)
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
        const errJson = await res.json().catch(() => ({}))
        toast.error(errJson.message || "Failed to update Proposal Agreement")
      }
    } catch (err) {
      toast.error("Error updating proposal")
    } finally {
      setSavingProposal(false)
    }
  }

  const handleAdminApprove = async () => {
    if (isLocked) return
    try {
      setSavingProposal(true)
      const res = await fetch(`/admin/b2b-quotes/${quoteId}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      if (res.ok) {
        toast.success("Offer approved successfully")
        await fetchNegotiationAndProposal()
      } else {
        toast.error("Failed to approve offer")
      }
    } catch (err) {
      toast.error("Error approving offer")
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
        <Text
          size="small"
          className={`font-semibold mb-1 ${isAdmin ? "text-ui-fg-on-color" : "text-ui-fg-muted"
            }`}
        >
          {isAdmin ? "Wholesale Team (You)" : "Customer"}
        </Text>
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
          {!isLocked && adminOfferApproved && (
            <Badge color="green" className="font-semibold px-3 py-1">
              🟢 Proposal Approved
            </Badge>
          )}
          {!isLocked && !adminOfferApproved && !isDirty && (
            <Button
              variant="primary"
              size="small"
              onClick={handleAdminApprove}
              isLoading={savingProposal}
            >
              Accept Offer
            </Button>
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
              conversation.messages.map(renderMessageCard)
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
                              {item.title}
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
