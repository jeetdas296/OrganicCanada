import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrganicCanadaProviderService } from "../../../../../../modules/fulfillment-pal/providers/organic-canada/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const shipmentId = req.params.shipmentId

  // 1. Fetch PAL Shipment with associated data
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
      "selected_provider_id"
    ],
    filters: { id: shipmentId }
  })

  const shipment = palShipments[0]
  if (!shipment) {
    return res.status(404).json({ message: "Shipment not found" })
  }

  // 2. Fetch Packages
  let packages: any[] = []
  try {
    const { data: pkgs } = await query.graph({
      entity: "pal_package",
      fields: ["id", "package_type", "weight", "weight_unit", "quantity", "length", "width", "height", "dimension_unit"],
      filters: { shipment_id: shipmentId }
    })
    packages = pkgs
  } catch (err) {}

  // 3. Construct ShipmentContext approximation for the carrier adapter
  const context: any = {
    shipmentId: shipment.id,
    orderId: shipment.order_id,
    orderType: shipment.order_type,
    tradeType: shipment.trade_type,
    transportMode: shipment.transport_mode,
    origin: {
      countryCode: "CA",
      city: "Toronto",
      postalCode: "M5V2T6"
    },
    destination: {
      countryCode: "US", // Assume cross border export for now or base it on DB if addresses exist
      city: "New York",
      postalCode: "10001"
    },
    packages: packages.map(p => ({
      weight: Number(p.weight) || 1,
      length: Number(p.length) || 10,
      width: Number(p.width) || 10,
      height: Number(p.height) || 10,
      quantity: Number(p.quantity) || 1
    })),
    metadata: {
      // additional data
    }
  }

  // 4. Instantiate PAL Provider to access internal carrier logic
  const provider = new OrganicCanadaProviderService()
  
  // Actually, we can use the provider's router logic
  const carrier = provider.routeCarrier(context)
  
  if (!carrier) {
    return res.json({ rates: [], message: "No capable carriers found for this shipment context." })
  }

  try {
    const rates = await carrier.getRates(context)
    return res.json({ 
      rates: rates.map(r => ({
        ...r,
        carrierId: carrier.getIdentifier()
      })),
      carrier: carrier.getIdentifier()
    })
  } catch (err: any) {
    console.error("Failed to fetch rates:", err.message)
    return res.status(500).json({ message: err.message, rates: [] })
  }
}
