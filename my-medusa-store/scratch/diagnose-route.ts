import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function myScript({ container }: { container: any }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  // Fake what the API route does:
  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "external_reference"
    ]
  })

  const orderIds = Array.from(new Set(palShipments.map((s: any) => s.order_id).filter(Boolean)))
  const externalRefs = Array.from(new Set(palShipments.map((s: any) => s.external_reference).filter(Boolean)))

  let orders: any[] = []
  if (orderIds.length > 0) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "items.*", "currency_code"],
      filters: { id: orderIds }
    })
    orders = data
  }

  let fulfillments: any[] = []
  if (externalRefs.length > 0) {
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    fulfillments = await fulfillmentModuleService.listFulfillments(
      { id: externalRefs }, 
      { relations: ["items"] }
    )
  }
  
  const orderMap = new Map(orders.map(o => [o.id, o]))
  const fulfillmentMap = new Map(fulfillments.map(f => [f.id, f]))

  for (const shipment of palShipments) {
    if (shipment.external_reference === "ful_01M0S52RWSEEYNAW2D6EVGV51N") {
      console.log("Analyzing shipment:", shipment.id)
      
      const order = orderMap.get(shipment.order_id)
      const fulfillment = fulfillmentMap.get(shipment.external_reference)
      
      console.log("Found order:", !!order, order?.items?.length)
      console.log("Found fulfillment:", !!fulfillment, fulfillment?.items?.length)
      
      const fulfillmentItemIds = fulfillment?.items?.map((fi: any) => fi.line_item_id || fi.item_id) || []
      console.log("fulfillmentItemIds:", fulfillmentItemIds)
      
      const orderItems = order?.items || []
      const shipmentOrderItems = orderItems.filter((i: any) => fulfillmentItemIds.includes(i.id))
      console.log("shipmentOrderItems:", shipmentOrderItems.length)
      
      let totalQty = 0
      for (const item of shipmentOrderItems) {
        totalQty += Number(item.quantity || 0)
      }
      console.log("Total Qty:", totalQty)
    }
  }
}
