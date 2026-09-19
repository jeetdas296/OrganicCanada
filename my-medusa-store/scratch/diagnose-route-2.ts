import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function myScript({ container }: { container: any }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  // Fake what the API route does:
  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "vendor_id",
      "order_type",
      "trade_type",
      "transport_mode",
      "status",
      "selected_provider_id",
      "created_at",
      "external_reference" // <-- WAIT! IS THIS IN THE FIELDS LIST IN route.ts??
    ]
  })

  // Log what is actually loaded
  const s = palShipments.find((x:any) => x.id === "01M0S52RYKPPASY8A686MC55VH")
  console.log("Shipment loaded:", !!s)
  console.log("Shipment external_reference:", s?.external_reference)
}
