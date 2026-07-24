import { Container, Heading, Text, Button, Input, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

type QuoteNegotiationProps = {
  draftOrderId: string
  isB2bQuote: boolean
}

export const QuoteNegotiation = ({ draftOrderId, isB2bQuote }: QuoteNegotiationProps) => {
  const [conversation, setConversation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    if (!isB2bQuote) return

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/admin/b2b-quotes/${draftOrderId}/negotiation`)
        if (res.ok) {
          const json = await res.json()
          setConversation(json.conversation)
        }
      } catch (err) {
        console.error("Failed to fetch negotiation", err)
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
    
    // Poll every 3 seconds for live updates
    const interval = setInterval(fetchConversation, 3000)
    return () => clearInterval(interval)
  }, [isB2bQuote, draftOrderId])

  if (!isB2bQuote) {
    return null
  }

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
            messages: [...(prev.messages || []), newMsg]
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

  return (
    <Container className="p-8 mb-4">
      <Heading className="mb-4">Quote Negotiation 💬</Heading>

      {loading ? (
        <Text className="text-ui-fg-muted">Loading conversation...</Text>
      ) : (
        <div className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2 border border-ui-border-base rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-ui-bg-subtle">
            {!conversation?.messages?.length ? (
              <Text className="text-ui-fg-muted text-center py-8">No messages yet. Start the negotiation!</Text>
            ) : (
              conversation.messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] rounded-lg p-3 ${msg.sender_type === "admin"
                      ? "bg-ui-bg-interactive text-ui-fg-on-color self-end"
                      : "bg-ui-bg-base border border-ui-border-base self-start"
                    }`}
                >
                  <Text size="small" className={msg.sender_type === "admin" ? "text-ui-fg-on-color" : "text-ui-fg-muted"}>
                    {msg.sender_type === "admin" ? "Admin" : "Customer"}
                  </Text>
                  <Text>{msg.text}</Text>
                  {msg.price_proposal && (
                    <Text className="mt-2 font-medium">Proposed Price: ${msg.price_proposal}</Text>
                  )}
                </div>
              ))
            )}
          </div>

          {conversation?.status === "closed" ? (
             <div className="bg-ui-bg-base border border-ui-border-base text-ui-fg-muted p-4 rounded-md">
               <Text>This order is finalized and the negotiation is closed.</Text>
             </div>
          ) : conversation?.status === "agreement_reached" ? (
            <div className="bg-ui-bg-success-subtle border border-ui-border-success text-ui-fg-success p-4 rounded-md">
              <Text>Agreement reached! The customer has accepted the terms. You can now finalize this draft order.</Text>
            </div>
          ) : (
            <div className="flex gap-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message or offer..."
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
      )}
    </Container>
  )
}
