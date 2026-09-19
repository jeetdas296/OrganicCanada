import { init } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolve } from "path"

export default async function myScript({ container }: { container: any }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "external_reference"
    ]
  })
  
  console.log("PAL Shipments count:", palShipments.length)
  for (const s of palShipments) {
    console.log("Shipment:", s.id, "External Ref:", s.external_reference)
  }

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const refs = palShipments.map((s: any) => s.external_reference).filter(Boolean)

  if (refs.length > 0) {
    const fulfillments = await fulfillmentService.listFulfillments(
      { id: refs },
      { relations: ["items"] }
    )
    console.log("Found fulfillments for those refs:", fulfillments.length)
    for (const f of fulfillments) {
      console.log("Ful:", f.id, "Items:", f.items?.length, "Line Item IDs:", f.items?.map((i: any) => i.line_item_id))
    }
  }
}
