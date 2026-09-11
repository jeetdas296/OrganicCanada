import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ShipmentContext } from "../../types"
import { FULFILLMENT_PAL_MODULE } from "../../index"

export const createPalShipmentStepId = "create-pal-shipment-step"

export const createPalShipmentStep = createStep(
  createPalShipmentStepId,
  async (input: { 
    orderId: string, 
    fulfillmentId?: string, 
    locationId?: string,
    items: any[], 
    packages: any[],
    originStockLocationAddress: any,
    destinationShippingAddress: any,
    orderType: string
  }, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)

    // 1. Idempotency Check: lookup existing shipment by Medusa fulfillment ID / external_reference
    const externalRef = input.fulfillmentId || "unknown_fulfillment"
    const existingShipments = await (palService as any).listPalShipments({
      external_reference: externalRef
    }, {
      relations: ["packages"]
    })

    if (existingShipments && existingShipments.length > 0) {
      const shipment = existingShipments[0] as any
      
      // Load addresses if available
      let originCountry = ""
      let originCity = ""
      if (shipment.origin_address_id) {
        try {
          const originAddr = await (palService as any).retrievePalShipmentAddress(shipment.origin_address_id)
          originCountry = originAddr.country_code
          originCity = originAddr.city
        } catch (_) {}
      }

      let destCountry = ""
      let destCity = ""
      if (shipment.destination_address_id) {
        try {
          const destAddr = await (palService as any).retrievePalShipmentAddress(shipment.destination_address_id)
          destCountry = destAddr.country_code
          destCity = destAddr.city
        } catch (_) {}
      }

      const context: ShipmentContext = {
        shipmentId: shipment.id,
        orderId: shipment.order_id,
        fulfillmentId: shipment.external_reference || undefined,
        orderType: shipment.order_type,
        tradeType: shipment.trade_type || undefined,
        tradeDirection: shipment.trade_direction || undefined,
        transportMode: shipment.transport_mode || undefined,
        origin: { countryCode: originCountry, city: originCity },
        destination: { countryCode: destCountry, city: destCity },
        items: input.items || [],
        packages: (shipment.packages || []).map((p: any) => ({
          id: p.id,
          packageType: p.package_type,
          weight: p.weight,
          quantity: p.quantity
        })),
        metadata: {
          location_id: input.locationId
        }
      }
      return new StepResponse(context, context.shipmentId)
    }

    // 2. Validate input IDs
    if (!input.fulfillmentId) {
      throw new Error("Cannot create PAL shipment without a valid fulfillmentId")
    }

    if (!input.orderId) {
      throw new Error("Cannot create PAL shipment without a valid orderId")
    }

    // 3. Origin from Input
    const originStockLocationAddress = input.originStockLocationAddress
    if (!originStockLocationAddress?.country_code) {
      throw new Error(`Unable to resolve fulfillment origin country for fulfillment ${input.fulfillmentId}`)
    }

    // 4. Destination and Order Type from Input
    const orderType = input.orderType || "B2C"
    const destinationShippingAddress = input.destinationShippingAddress
    if (!destinationShippingAddress?.country_code) {
      throw new Error(`Unable to resolve destination country for order ${input.orderId}`)
    }

    // 5. Create Shipment Record in Database
    const shipment = await (palService as any).createPalShipments({
      order_id: input.orderId,
      external_reference: externalRef,
      order_type: orderType,
      trade_type: "DOMESTIC",
      trade_direction: "DOMESTIC",
      origin_address_id: "tmp_origin",
      destination_address_id: "tmp_dest",
      status: "CREATED"
    } as any) as any

    // 6. Create PAL Shipment Addresses using resolved dynamic data
    const originAddr = await (palService as any).createPalShipmentAddresses({
      shipment_id: shipment.id,
      type: "FROM",
      first_name: originStockLocationAddress.first_name || null,
      last_name: originStockLocationAddress.last_name || null,
      company: originStockLocationAddress.company || null,
      address_1: originStockLocationAddress.address_1 || "",
      address_2: originStockLocationAddress.address_2 || null,
      city: originStockLocationAddress.city || "",
      province: originStockLocationAddress.province || null,
      postal_code: originStockLocationAddress.postal_code || "",
      country_code: originStockLocationAddress.country_code.toUpperCase(),
      phone: originStockLocationAddress.phone || null
    } as any) as any

    const destAddr = await (palService as any).createPalShipmentAddresses({
      shipment_id: shipment.id,
      type: "TO",
      first_name: destinationShippingAddress.first_name || null,
      last_name: destinationShippingAddress.last_name || null,
      company: destinationShippingAddress.company || null,
      address_1: destinationShippingAddress.address_1 || "",
      address_2: destinationShippingAddress.address_2 || null,
      city: destinationShippingAddress.city || "",
      province: destinationShippingAddress.province || null,
      postal_code: destinationShippingAddress.postal_code || "",
      country_code: destinationShippingAddress.country_code.toUpperCase(),
      phone: destinationShippingAddress.phone || null
    } as any) as any

    // Update address references on shipment
    await (palService as any).updatePalShipments({
      id: shipment.id,
      origin_address_id: originAddr.id,
      destination_address_id: destAddr.id
    } as any)

    // 7. Create Packages
    const inputPackages = input.packages && input.packages.length > 0
      ? input.packages
      : [{ packageType: "box", weight: 5, quantity: 1 }]
      
    const persistedPackages: any[] = []
    for (const pkg of inputPackages) {
      const p = await (palService as any).createPalPackages({
        shipment_id: shipment.id,
        package_type: pkg.packageType || "box",
        weight: pkg.weight || 1,
        quantity: pkg.quantity || 1
      } as any) as any
      persistedPackages.push(p)
    }

    // 8. Persist Status History transition (null -> CREATED)
    await (palService as any).createPalShipmentStatusHistories({
      shipment_id: shipment.id,
      from_status: null,
      to_status: "CREATED",
      source: "SYSTEM",
      reason: "Initial shipment registration"
    } as any)

    const context: ShipmentContext = {
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      fulfillmentId: externalRef,
      orderType: shipment.order_type,
      tradeType: shipment.trade_type,
      tradeDirection: shipment.trade_direction,
      origin: { 
        countryCode: originAddr.country_code, 
        city: originAddr.city,
        province: originAddr.province || undefined,
        postalCode: originAddr.postal_code || undefined,
        address1: originAddr.address_1 || undefined,
        company: originAddr.company || undefined
      },
      destination: { 
        countryCode: destAddr.country_code, 
        city: destAddr.city,
        province: destAddr.province || undefined,
        postalCode: destAddr.postal_code || undefined,
        address1: destAddr.address_1 || undefined,
        company: destAddr.company || undefined
      },
      items: input.items || [],
      packages: persistedPackages.map((p: any) => ({
        id: p.id,
        packageType: p.package_type,
        weight: p.weight,
        quantity: p.quantity
      })),
      metadata: {
        location_id: input.locationId
      }
    }
    
    return new StepResponse(context, context.shipmentId)
  },
  async (shipmentId, { container }) => {
    if (!shipmentId) return
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)
    try {
      await (palService as any).updatePalShipments({
        id: shipmentId,
        status: "FAILED"
      } as any)
    } catch (_) {}
  }
)

