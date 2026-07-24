"use client"
import { useState, useEffect } from "react"
import { getQuoteNegotiation, postQuoteNegotiationMessage, acceptQuoteOffer } from "@lib/data/b2b-quotes"

type QuoteNegotiationProps = {
  id: string
}

export const QuoteNegotiation = ({ id }: QuoteNegotiationProps) => {
  const [conversation, setConversation] = useState<any>(null)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const res = await getQuoteNegotiation(id)
        setConversation(res.conversation)
        setOrderStatus(res.order_status)
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

    fetchConversation()
    
    const interval = setInterval(fetchConversation, 3000)
    return () => clearInterval(interval)
  }, [id])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const res = await postQuoteNegotiationMessage(id, newMessage)

      setConversation((prev: any) => {
        if (!prev) return { id: "new", status: "open", messages: [res.message] }
        return {
          ...prev,
          messages: [...(prev.messages || []), res.message]
        }
      })
      setNewMessage("")
    } catch (err) {
      console.error(err)
      alert("Failed to send message")
    }
  }

  const handleAcceptOffer = async () => {
    try {
      const res = await acceptQuoteOffer(id)
      
      setConversation(res.conversation)
      alert("Offer accepted! The Admin will finalize the order.")
    } catch (err) {
      console.error(err)
      alert("Failed to accept offer")
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

  const isOrdered = orderStatus === "completed" || orderStatus === "ordered" || orderStatus === "canceled"
  const isAgreementReached = conversation?.status === "agreement_reached"
  const isClosed = conversation?.status === "closed"

  return (
    <div className="w-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans" data-testid="quote-negotiation-wrapper">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-y-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-2">
              Quote Negotiation
            </h1>
            <p className="text-gray-500 text-base">
              Discuss pricing, quantities, or terms directly with the Admin.
            </p>
          </div>
          <div className="text-right">
            <span className="block text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Quote Reference</span>
            <span className="text-2xl font-black text-gray-900">#{id.split('_')[1] || id}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-y-8">
            
            {/* Chat Timeline */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl rounded-3xl p-6 sm:p-10 flex flex-col gap-y-6 h-[500px] overflow-y-auto custom-scrollbar">
              {!conversation?.messages?.length ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No messages yet</h3>
                  <p className="text-gray-500">Send a message to start negotiating with our wholesale team!</p>
                </div>
              ) : (
                conversation.messages.map((msg: any) => {
                  const isCustomer = msg.sender_type === "customer"
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] rounded-2xl p-5 shadow-sm ${
                        isCustomer 
                          ? "bg-gradient-to-br from-gray-900 to-black text-white self-end rounded-tr-sm" 
                          : "bg-white border border-gray-100 self-start rounded-tl-sm"
                      }`}
                    >
                      <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${isCustomer ? "text-gray-400" : "text-gray-400"}`}>
                        {isCustomer ? "You" : "Wholesale Team"}
                      </span>
                      <p className={`text-base leading-relaxed ${isCustomer ? "text-gray-100" : "text-gray-700"}`}>
                        {msg.text}
                      </p>
                      {msg.price_proposal && (
                        <div className={`mt-4 p-3 rounded-lg ${isCustomer ? "bg-white/10" : "bg-gray-50 border border-gray-100"}`}>
                          <p className={`text-sm font-bold uppercase tracking-wider ${isCustomer ? "text-gray-300" : "text-gray-500"} mb-1`}>
                            Proposed Offer
                          </p>
                          <p className={`text-2xl font-black ${isCustomer ? "text-white" : "text-gray-900"}`}>
                            ${msg.price_proposal}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Interaction Area */}
            {isClosed ? (
              <div className="bg-gray-100 border border-gray-200 shadow-sm text-gray-600 p-8 rounded-3xl flex items-center gap-x-6">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shrink-0">
                  <span className="text-3xl">🔒</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl mb-1">Negotiation Closed</h3>
                  <p className="text-gray-500 text-lg">This order has been finalized or canceled. Negotiations are now closed.</p>
                </div>
              </div>
            ) : isOrdered ? (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl text-white p-8 rounded-3xl flex items-center gap-x-6">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-3xl">🎉</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl mb-1">Order Finalized</h3>
                  <p className="text-green-50 text-lg">This quote has been successfully converted into an order. Negotiations are now closed.</p>
                </div>
              </div>
            ) : isAgreementReached ? (
              <div className="bg-white/80 backdrop-blur-xl border border-green-200 shadow-xl p-8 rounded-3xl flex items-center gap-x-6">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-3xl">🤝</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl text-green-900 mb-1">Agreement Reached</h3>
                  <p className="text-green-700 text-lg">You have accepted the offer. The Admin will now finalize the Draft Order.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-xl rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col gap-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message, questions, or counter-offer..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all shadow-inner"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage()
                      }}
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold shadow-md hover:bg-black hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      Send Message
                    </button>
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                    <button 
                      onClick={handleAcceptOffer}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                      Accept Current Offer
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  )
}
