export async function resolveConversationId(id: string, query: any): Promise<string> {
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id }
  })
  
  const order = orders?.[0]
  
  // If we found an Order and it has a draft_order_id metadata, use that.
  // Otherwise, the ID itself is likely the Draft Order (Cart) ID, so we use it directly.
  return (order?.metadata?.draft_order_id as string) || id
}
