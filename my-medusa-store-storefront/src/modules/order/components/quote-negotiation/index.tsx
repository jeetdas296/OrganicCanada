import { useState, useEffect, useRef } from "react"
import {
  getQuoteNegotiation,
  postQuoteNegotiationMessage,
  acceptQuoteOffer,
  initiateQuotePaymentSession,
  getQuoteProposal,
  updateQuoteProposal,
  searchStoreCatalogProducts,
} from "@lib/data/b2b-quotes"
import StripePayment from "../../../../app/[countryCode]/(checkout)/checkout/StripePayment"

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

type QuoteNegotiationProps = {
  id: string
}

export const QuoteNegotiation = ({ id }: QuoteNegotiationProps) => {
  const [conversation, setConversation] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const [quoteStatus, setQuoteStatus] = useState<string>("pending")
  const [orderTotal, setOrderTotal] = useState<number | null>(null)
  const [clientSecret, setClientSecret] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Interactive proposal editing state
  const [itemEdits, setItemEdits] = useState<Record<string, { quantity?: number; unit_price?: number }>>({})
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([])

  // Shipping & Discount State
  const [shippingOptionId, setShippingOptionId] = useState<string>("")
  const [shippingPrice, setShippingPrice] = useState<number | undefined>(undefined)
  const [discountPercentage, setDiscountPercentage] = useState<number | undefined>(undefined)
  const [fixedDiscount, setFixedDiscount] = useState<number | undefined>(undefined)
  const [promotionCode, setPromotionCode] = useState<string>("")

  // Modal / Popover state for adding catalog line items
  const [showAddModal, setShowAddModal] = useState(false)

  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false)

  const handleSearchCatalog = async (query: string = "") => {
    setIsSearchingCatalog(true)
    try {
      const res = await searchStoreCatalogProducts(query, proposal?.currency_code || "usd", proposal?.id)
      setCatalogSearchResults(res.variants || [])
    } catch (e) {
      console.error("Failed to search catalog products:", e)
    } finally {
      setIsSearchingCatalog(false)
    }
  }

  const handleAddCatalogProduct = async (variant: any) => {
    setSavingProposal(true)
    try {
      await updateQuoteProposal(id, {
        items_to_add: [
          {
            variant_id: variant.variant_id,
            quantity: 1,
            unit_price: variant.unit_price,
            title: `${variant.product_title} — ${variant.variant_title}`,
          },
        ],
      })
      await fetchNegotiationAndProposal()
      setShowAddModal(false)
    } catch (err: any) {
      console.error("Failed to add product to proposal:", err)
      alert(err.message || "Failed to add product")
    } finally {
      setSavingProposal(false)
    }
  }

  useEffect(() => {
    if (showAddModal && catalogSearchResults.length === 0) {
      handleSearchCatalog("")
    }
  }, [showAddModal])

  const [proposalNote, setProposalNote] = useState<string>("")
  const [noteDirty, setNoteDirty] = useState(false)
  const [savingProposal, setSavingProposal] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const noteDirtyRef = useRef(false)
  noteDirtyRef.current = noteDirty

  const fetchNegotiationAndProposal = async () => {
    try {
      const [convRes, propRes] = await Promise.all([
        getQuoteNegotiation(id).catch(() => null),
        getQuoteProposal(id).catch(() => null),
      ])

      if (convRes) {
        setConversation(convRes.conversation)
        setOrderStatus(convRes.order_status)
        setQuoteStatus(convRes.quote_status || "pending")
        setOrderTotal(convRes.order_total ?? convRes.approved_price ?? null)
      }

      if (propRes) {
        setProposal(propRes.proposal)
        setIsLocked(propRes.is_locked || false)
        if (propRes.quote_status) {
          setQuoteStatus(propRes.quote_status)
        }
        // CRITICAL BUG FIX: Never overwrite proposalNote while the customer is typing!
        if (!noteDirtyRef.current) {
          setProposalNote(propRes.proposal?.metadata?.proposal_note || "")
        }
        if (propRes.proposal?.metadata?.b2b_discount_percentage !== undefined) {
          setDiscountPercentage(Number(propRes.proposal.metadata.b2b_discount_percentage))
        }
        if (propRes.proposal?.metadata?.b2b_fixed_discount !== undefined) {
          setFixedDiscount(Number(propRes.proposal.metadata.b2b_fixed_discount))
        }
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status
      if (status === 401) {
        setError("Please log in to view this quote.")
      } else if (status === 403 || status === 404) {
        setError("Quote not found or you do not have permission to view it.")
      } else {
        setError("Failed to load negotiation. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegotiationAndProposal()

    const interval = setInterval(fetchNegotiationAndProposal, 5000)
    return () => clearInterval(interval)
  }, [id])

  const isOrdered =
    orderStatus === "completed" ||
    orderStatus === "ordered" ||
    orderStatus === "canceled" ||
    quoteStatus === "paid" ||
    quoteStatus === "completed"
  const isAgreementReached = conversation?.status === "agreement_reached"
  const isReadyForPayment =
    quoteStatus === "ready_for_payment" ||
    quoteStatus === "payment_pending" ||
    quoteStatus === "approved" ||
    isAgreementReached ||
    isLocked
  const isClosed = conversation?.status === "closed"

  useEffect(() => {
    if (isReadyForPayment && !clientSecret && !isOrdered && !isClosed) {
      initiateQuotePaymentSession(id)
        .then((data) => {
          if (data.client_secret) {
            setClientSecret(data.client_secret)
          }
          if (data.amount !== undefined) {
            setOrderTotal(data.amount)
          }
        })
        .catch((err) => console.error("Error loading quote Stripe session:", err))
    }
  }, [isReadyForPayment, id, clientSecret, isOrdered, isClosed])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const res = await postQuoteNegotiationMessage(id, newMessage)

      setConversation((prev: any) => {
        if (!prev) return { id: "new", status: "open", messages: [res.message] }
        return {
          ...prev,
          messages: [...(prev.messages || []), res.message],
        }
      })
      setNewMessage("")
    } catch (err) {
      console.error(err)
      alert("Failed to send message")
    }
  }

  const isDirty =
    Object.keys(itemEdits).length > 0 ||
    removedItemIds.length > 0 ||
    Boolean(shippingOptionId) ||
    promotionCode !== "" ||
    (noteDirty && proposalNote !== (proposal?.metadata?.proposal_note || ""))

  const handleSaveProposal = async () => {
    if (isReadyForPayment || isLocked || isOrdered || isClosed) {
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
      return
    }

    setSavingProposal(true)
    setSaveSuccess(false)
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

      const res = await updateQuoteProposal(id, payload)

      if (res.success || res.order) {
        setItemEdits({})
        setRemovedItemIds([])
        setShippingOptionId("")
        setPromotionCode("")
        setNoteDirty(false)
        noteDirtyRef.current = false
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 4000)

        // Optimistically synchronise Proposal Agreement & append new version history message to chat
        if (res.order) {
          setProposal(res.order)
          setProposalNote(res.order?.metadata?.proposal_note || "")
        }
        if (res.message) {
          setConversation((prev: any) => {
            if (!prev) return { id: "new", status: "open", messages: [res.message] }
            return {
              ...prev,
              messages: [...(prev.messages || []), res.message],
            }
          })
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to save proposal changes")
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
  }

  const handleAcceptOffer = async () => {
    try {
      const res = await acceptQuoteOffer(id)

      setConversation(res.conversation)
      setQuoteStatus("ready_for_payment")
      setIsLocked(true)
      if (res.order_total || res.approved_price) {
        setOrderTotal(res.order_total || res.approved_price)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to accept offer")
    }
  }

  const handleItemQtyChange = (itemId: string, quantity: number) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity,
      },
    }))
  }

  const handleItemPriceChange = (itemId: string, unit_price: number) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        unit_price,
      },
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Pending Admin Review
          </span>
        )
      case "negotiating":
        return (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Active Negotiation
          </span>
        )
      case "approved":
        return (
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Approved Offer
          </span>
        )
      case "ready_for_payment":
        return (
          <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Ready for Payment
          </span>
        )
      case "payment_pending":
        return (
          <span className="bg-orange-100 text-orange-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Payment Pending
          </span>
        )
      case "paid":
      case "completed":
        return (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Paid & Order Placed
          </span>
        )
      default:
        return (
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            {status}
          </span>
        )
    }
  }

  if (error) {
    return (
      <div className="w-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-2xl p-12 rounded-3xl text-center max-w-lg w-full">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  const currencyCode = proposal?.currency_code || "USD"
  const shippingMethodName =
    proposal?.shipping_methods?.[0]?.name ||
    proposal?.shipping_methods?.[0]?.shipping_option?.name ||
    "Standard Shipping"

  const activeItems = (proposal?.items || []).filter(
    (item: any) => !removedItemIds.includes(item.id)
  )

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

  const calculatedTotal = Math.max(
    0,
    itemsSubtotal + calculatedShipping + shippingTax - discountAmount
  )

  return (
    <div
      className="w-full bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans"
      data-testid="quote-negotiation-wrapper"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-y-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-2">
              B2B Commercial Quotation & Negotiation
            </h1>
            <p className="text-gray-500 text-base">
              Collaborate on pricing, quantities, and terms directly with our wholesale team.
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-y-2">
            <div>
              <span className="block text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">
                Quote Reference
              </span>
              <span className="text-2xl font-black text-gray-900">
                #{id.split("_")[1] || id}
              </span>
            </div>
            <div className="flex items-center gap-x-2">
              {getStatusBadge(quoteStatus)}
              {isLocked && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  🔒 Locked (Accepted)
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN (40%, 5 cols): Chat Timeline & Version History */}
            <div className="lg:col-span-5 bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl rounded-3xl p-6 sm:p-8 flex flex-col gap-y-6 h-[680px]">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-extrabold text-gray-900">
                  Conversation & Version History
                </h2>
                <p className="text-xs text-gray-400">
                  All discussion and proposal revisions are recorded permanently.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-y-4 pr-1 custom-scrollbar">
                {!conversation?.messages?.length ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">💬</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      No messages yet
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Send a message or adjust the proposal terms to start collaborating!
                    </p>
                  </div>
                ) : (
                  conversation.messages.map((msg: any) => {
                    const isCustomer = msg.sender_type === "customer"
                    const isProposalUpdate = msg.message_type === "proposal_update"

                    if (isProposalUpdate) {
                      return (
                        <div
                          key={msg.id}
                          className="flex flex-col w-full rounded-2xl p-4 bg-gray-50 border border-gray-200 my-1 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              📄 Proposal Updated ({isCustomer ? "You" : "Wholesale Team"})
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {msg.created_at
                                ? new Date(msg.created_at).toLocaleTimeString()
                                : ""}
                            </span>
                          </div>
                          <p className="text-xs font-mono whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {msg.text}
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] rounded-2xl p-4 shadow-sm ${isCustomer
                            ? "bg-gradient-to-br from-gray-900 to-black text-white self-end rounded-tr-sm"
                            : "bg-white border border-gray-100 self-start rounded-tl-sm text-gray-800"
                          }`}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider mb-1 ${isCustomer ? "text-gray-400" : "text-gray-400"
                            }`}
                        >
                          {isCustomer ? "You" : "Wholesale Team"}
                        </span>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        {msg.price_proposal && (
                          <div
                            className={`mt-3 p-3 rounded-lg ${isCustomer
                                ? "bg-white/10"
                                : "bg-gray-50 border border-gray-100"
                              }`}
                          >
                            <p
                              className={`text-xs font-bold uppercase tracking-wider ${isCustomer ? "text-gray-300" : "text-gray-500"
                                } mb-1`}
                            >
                              Proposed Offer
                            </p>
                            <p
                              className={`text-xl font-black ${isCustomer ? "text-white" : "text-gray-900"
                                }`}
                            >
                              {formatMoney(Number(msg.price_proposal), currencyCode)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Chat Input */}
              {isClosed ? (
                <div className="bg-gray-100 border border-gray-200 text-gray-500 p-3 rounded-2xl text-center text-sm font-semibold">
                  Negotiation is closed.
                </div>
              ) : (
                <div className="flex gap-x-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message or question..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage()
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-gray-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-black transition-colors shadow-sm"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (60%, 7 cols): Live Interactive Proposal Agreement */}
            <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl rounded-3xl p-6 sm:p-8 flex flex-col gap-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Commercial Proposal Agreement
                  </h2>
                  <p className="text-xs text-gray-500">
                    Review or adjust line items, quantities, and terms below.
                  </p>
                </div>
                <div className="flex items-center gap-x-2">
                  {!isLocked && !isReadyForPayment && !isOrdered && !isClosed && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gray-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:bg-black transition-colors"
                    >
                      ＋ Add Line Item
                    </button>
                  )}
                  {isLocked || isReadyForPayment ? (
                    <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wide">
                      🔒 Read Only (Accepted)
                    </span>
                  ) : isDirty ? (
                    <span className="bg-amber-100 text-amber-900 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wide">
                      ⚠️ Unsaved Changes
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-800 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wide">
                      ✓ Up to Date
                    </span>
                  )}
                </div>
              </div>

              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-sm font-semibold flex items-center gap-x-2">
                  <span>✓</span>
                  <span>Proposal Agreement successfully updated and shared with Wholesale Team!</span>
                </div>
              )}

              {/* Products Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Product & SKU</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Unit Price ($)</th>
                      <th className="py-3 px-4 text-right">Item Total ($)</th>
                      {!isLocked && !isReadyForPayment && !isOrdered && !isClosed && (
                        <th className="py-3 px-4"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {activeItems.map((item: any) => {
                      const currentQty =
                        itemEdits[item.id]?.quantity ?? item.quantity
                      const currentPrice =
                        itemEdits[item.id]?.unit_price ?? Number(item.unit_price || 0)
                      const total = currentQty * currentPrice
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">
                                {item.title}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">
                                {item.variant?.sku ||
                                  item.variant_title ||
                                  item.variant?.title ||
                                  "Standard Variant"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="number"
                              min={1}
                              disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                              value={currentQty}
                              onChange={(e) =>
                                handleItemQtyChange(
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                              value={currentPrice}
                              onChange={(e) =>
                                handleItemPriceChange(
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-gray-900">
                            {formatMoney(total, currencyCode)}
                          </td>
                          {!isLocked && !isReadyForPayment && !isOrdered && !isClosed && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() =>
                                  setRemovedItemIds((prev) => [...prev, item.id])
                                }
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Remove item"
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {/* No custom or pending catalog items - only catalog products added directly to Draft Order */}
                  </tbody>
                </table>
              </div>

              {/* Shipping & Delivery Terms (from Draft Order) */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col gap-y-2">
                <span className="text-sm font-extrabold text-gray-900">
                  Shipping & Delivery
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold block mb-1">
                      Shipping Method
                    </span>
                    <span className="font-bold text-gray-900">
                      {shippingMethodName}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold block mb-1">
                      Shipping Cost
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(calculatedShipping, currencyCode)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold block mb-1">
                      Shipping Tax
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(shippingTax, currencyCode)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  Shipping method and cost are calculated directly from the Draft Order.
                </span>
              </div>

              {/* Discounts Section */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col gap-y-2">
                <span className="text-sm font-extrabold text-gray-900">
                  Discounts & Promotion Code
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">
                      Discount Percentage (%)
                    </label>
                    <input
                      type="number"
                      placeholder="0%"
                      disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                      value={discountPercentage ?? ""}
                      onChange={(e) =>
                        setDiscountPercentage(
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">
                      Fixed Discount ({formatMoney(0, currencyCode).replace(/[0-9.,]/g, "").trim() || "$"})
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                      value={fixedDiscount ?? ""}
                      onChange={(e) =>
                        setFixedDiscount(
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    Promotion Code
                  </label>
                  <input
                    placeholder="ENTER_PROMO_CODE"
                    disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                    value={promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Proposal Notes (No Refresh Bug while typing) */}
              <div className="flex flex-col gap-y-2">
                <label className="text-sm font-extrabold text-gray-900">
                  Proposal Notes / Special Request Terms
                </label>
                <textarea
                  disabled={isLocked || isReadyForPayment || isOrdered || isClosed}
                  value={proposalNote}
                  onChange={(e) => {
                    setProposalNote(e.target.value)
                    setNoteDirty(true)
                    noteDirtyRef.current = true
                  }}
                  placeholder="Add delivery instructions, special requirements, or pricing request notes..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                />
                <span className="text-xs text-gray-400">
                  These notes will be reviewed by the admin wholesale team during negotiation.
                </span>
              </div>

              {/* Sticky Summary & Interaction Area */}
              <div className="mt-auto bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col gap-y-2 shadow-sm">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold">{formatMoney(itemsSubtotal, currencyCode)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Shipping:</span>
                  <span className="font-semibold">{formatMoney(calculatedShipping, currencyCode)}</span>
                </div>
                {shippingTax > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Shipping Tax:</span>
                    <span className="font-semibold">{formatMoney(shippingTax, currencyCode)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-700">
                    <span>Discounts:</span>
                    <span className="font-semibold">-{formatMoney(discountAmount, currencyCode)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="font-extrabold text-base text-gray-900">
                    Proposal Grand Total
                  </span>
                  <span className="text-2xl font-black text-gray-900">
                    {formatMoney(calculatedTotal, currencyCode)}
                  </span>
                </div>

                {!isReadyForPayment && !isOrdered && !isClosed ? (
                  <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-200">
                    {isDirty && (
                      <button
                        onClick={handleCancelChanges}
                        disabled={savingProposal}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl text-sm hover:bg-gray-100 transition-colors shadow-sm"
                      >
                        Cancel Changes
                      </button>
                    )}
                    <button
                      onClick={handleSaveProposal}
                      disabled={savingProposal}
                      className="flex-1 bg-gray-900 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-black transition-colors shadow-sm disabled:opacity-50"
                    >
                      {savingProposal ? "Saving Proposal..." : "Save Proposal Changes"}
                    </button>
                    {proposal?.metadata?.admin_offer_approved === true ? (
                      <button
                        onClick={handleAcceptOffer}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                      >
                        Accept Offer
                      </button>
                    ) : (
                      <div className="flex-1 bg-gray-200 text-gray-500 font-extrabold py-3 px-4 rounded-xl text-sm text-center shadow-inner cursor-not-allowed flex items-center justify-center">
                        Waiting for Admin Approval
                      </div>
                    )}
                  </div>
                ) : isClosed ? (
                  <div className="bg-gray-100 border border-gray-200 text-gray-600 p-4 rounded-xl text-center text-sm font-bold">
                    🔒 Negotiation Closed — Order Finalized or Canceled.
                  </div>
                ) : isOrdered ? (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl text-center font-extrabold text-sm shadow-md">
                    🎉 Order Finalized & Paid! All production and ERP workflows are active.
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-3 pt-3 border-t border-gray-200">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm font-semibold flex items-center gap-x-3">
                      <span className="text-xl">💳</span>
                      <span>
                        Agreement Locked — Offer Accepted. Proceed to Stripe payment below to finalize your order.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stripe Payment Session when Ready for Payment */}
              {isReadyForPayment && !isOrdered && !isClosed && (
                <div className="bg-white border border-amber-200 shadow-lg p-6 rounded-3xl mt-4">
                  <h3 className="font-extrabold text-xl text-gray-900 mb-2">
                    Complete Your Payment
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Pay securely using our Stripe checkout to finalize your wholesale order.
                  </p>
                  {clientSecret ? (
                    <StripePayment
                      clientSecret={clientSecret}
                      b2bQuoteId={id}
                      draftOrder={{ total: orderTotal || calculatedTotal }}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                      <span className="ml-3 text-sm text-gray-500">
                        Initializing Stripe secure payment session...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Line Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col gap-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-extrabold text-gray-900">
                  ＋ Add Product from Catalog
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-y-4 max-h-[65vh]">
                {/* Search bar */}
                <div className="flex gap-x-2">
                  <input
                    type="text"
                    placeholder="Search by product name, variant title, or SKU..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSearchCatalog(catalogSearchQuery)
                      }
                    }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchCatalog(catalogSearchQuery)}
                    disabled={isSearchingCatalog}
                    className="bg-gray-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isSearchingCatalog ? "..." : "Search"}
                  </button>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px]">
                  {isSearchingCatalog ? (
                    <div className="text-center py-8 text-gray-400 text-sm font-semibold">
                      Searching product catalog...
                    </div>
                  ) : catalogSearchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm font-semibold">
                      No products found. Try searching for another product name or SKU.
                    </div>
                  ) : (
                    catalogSearchResults.map((variant) => {
                      return (
                        <div
                          key={variant.variant_id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors bg-white gap-x-3"
                        >
                          <img
                            src={variant.thumbnail}
                            alt={variant.product_title}
                            className="w-12 h-12 object-contain rounded-xl bg-gray-50 border border-gray-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-sm text-gray-900 truncate">
                              {variant.product_title}
                            </h4>
                            <p className="text-xs text-gray-600 truncate font-semibold">
                              {variant.variant_title}{" "}
                              {variant.sku && (
                                <span className="text-gray-400">
                                  • SKU: {variant.sku}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-x-2 mt-1">
                              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {formatMoney(variant.unit_price, currencyCode)}
                              </span>
                              {variant.inventory_quantity !== undefined && (
                                <span className="text-xs text-gray-400 font-semibold">
                                  In stock: {variant.inventory_quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddCatalogProduct(variant)}
                            disabled={savingProposal}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 bg-gray-900 hover:bg-black text-white shadow-sm disabled:opacity-50"
                          >
                            + Add to Proposal
                          </button>
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
    </div>
  )
}
