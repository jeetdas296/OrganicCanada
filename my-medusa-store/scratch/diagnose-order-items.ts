import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function myScript({ container }: { container: any }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "items.*"
    ],
    filters: { id: "ord_01M0S52RWK45V4V0D8Z94VFTD4" } // Actually, let's just get the first one from the shipments
  })

  // To be safe, let's get the order associated with the fulfillment we know
  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: ["id", "order_id", "external_reference"],
    filters: { external_reference: "ful_01M0S52RWSEEYNAW2D6EVGV51N" }
  })

  if (palShipments.length > 0) {
    const { data: ords } = await query.graph({
      entity: "order",
      fields: ["id", "items.*"],
      filters: { id: palShipments[0].order_id }
    })
    
    console.log("Order items for", ords[0].id)
    for (const item of ords[0].items) {
      console.log("Order Item ID:", item.id, "Line Item ID (if any):", item.line_item_id)
      console.log(JSON.stringify(item, null, 2))
    }
  }
}
