import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../modules/fulfillment-pal"
import { ProviderRegistry } from "../../../../../../modules/fulfillment-pal/core"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
  const shipmentId = req.params.shipmentId
  const { carrier: carrierId, service } = req.body as any

  if (!shipmentId || !carrierId) {
    return res.status(400).json({ message: "Shipment ID and Carrier ID are required" })
  }

  let activeVendorId: string | null = null
  const authContext = (req as any).auth_context
  if (authContext?.actor_id) {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: authContext.actor_id }
    })
    activeVendorId = users[0]?.vendor?.id || null
  }

  const { data: palShipments } = await query.graph({
    entity: "pal_shipment",
    fields: [
      "id",
      "order_id",
      "order_type",
      "trade_type",
      "transport_mode",
      "status"
    ],
    filters: { id: shipmentId }
  })

  const shipment = palShipments[0]
  if (!shipment) {
    return res.status(404).json({ message: "Shipment not found" })
  }

  if (activeVendorId) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["items.variant.product.vendor.id"],
      filters: { id: shipment.order_id }
    })
    const vendorItems = (orders[0]?.items || []).filter((i: any) => (i?.variant?.product?.vendor?.id || "platform_direct") === activeVendorId)
    if (vendorItems.length === 0) {
      return res.status(403).json({ message: "Unauthorized" })
    }
  }

  const registry = new ProviderRegistry()
  
  const dbProviders = await (palService as any).listPalProviders({ code: "ORGANIC_CANADA" })
  const dhlConfig = dbProviders[0]?.configuration?.carriers?.dhl || { status: "NOT_CONFIGURED" }

  registry.register({
    id: "dhl",
    code: "DHL",
    name: "DHL",
    priority: 1,
    capabilities: {
      transportModes: ["PARCEL", "AIR_FREIGHT"],
      domestic: true,
      crossBorder: true,
      rating: true,
      booking: true,
      tracking: true,
      label: true,
      customs: true
    },
    adapter: {
      status: dhlConfig.status
    } as any
  })

  const provider = registry.getProvider(carrierId)
  if (!provider) {
    return res.status(400).json({ message: `Carrier ${carrierId} not recognized in PAL registry` })
  }

  if ((provider.adapter as any)?.status === "NOT_CONFIGURED") {
    // We allow selecting a NOT_CONFIGURED carrier! It will just fail booking later.
    // However we must validate capabilities
  }

  if (shipment.trade_type === "DOMESTIC" && !provider.capabilities.domestic) {
    return res.status(400).json({ message: `Carrier ${carrierId} does not support domestic trade` })
  }
  if (shipment.trade_type === "CROSS_BORDER" && !provider.capabilities.crossBorder) {
    return res.status(400).json({ message: `Carrier ${carrierId} does not support cross-border trade` })
  }
  
  if (shipment.transport_mode && !provider.capabilities.transportModes.includes(shipment.transport_mode as any)) {
    return res.status(400).json({ message: `Carrier ${carrierId} does not support transport mode ${shipment.transport_mode}` })
  }

  await (palService as any).updatePalShipments({
    id: shipment.id,
    selected_provider_id: carrierId,
    selected_service_id: service || null
  })

  return res.json({ success: true, carrier: carrierId })
}
