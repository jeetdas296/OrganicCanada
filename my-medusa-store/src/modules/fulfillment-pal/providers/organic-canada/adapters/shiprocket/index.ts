import { ProviderRate, ProviderShipmentResult } from "../../../provider-interface"
import { ICarrierAdapter, CarrierConnectionStatus } from "../../types"
import { ShipmentContext } from "../../../../types"
import { ShiprocketClient, ShiprocketApiError } from "./client"
import { loadShiprocketConfig, isShiprocketConfigured } from "./config"

export class ShiprocketAdapter implements ICarrierAdapter {
  private client: ShiprocketClient
  public status: CarrierConnectionStatus = "NOT_CONFIGURED"

  constructor(options?: any) {
    const config = loadShiprocketConfig(options)
    this.client = new ShiprocketClient(config)
    
    if (isShiprocketConfigured(config)) {
      this.status = "CONNECTED"
    } else {
      this.status = "NOT_CONFIGURED"
    }
  }

  getIdentifier(): string {
    return "shiprocket"
  }

  getStatus(): CarrierConnectionStatus {
    return this.status
  }

  private requireConfigured() {
    if (this.status === "NOT_CONFIGURED" || this.status === "ERROR") {
      throw new Error("PROVIDER_NOT_CONFIGURED")
    }
  }

  async testConnection(): Promise<{ status: CarrierConnectionStatus, error?: string }> {
    try {
      if (!isShiprocketConfigured(this.client.config)) {
        this.status = "NOT_CONFIGURED"
        return { status: "NOT_CONFIGURED" }
      }
      
      await this.client.ping()
      this.status = "CONNECTED"
      return { status: "CONNECTED" }
    } catch (err: any) {
      this.status = "ERROR"
      if (err instanceof ShiprocketApiError && (err.status === 401 || err.status === 403)) {
        return { status: "ERROR", error: "AUTHENTICATION_ERROR" }
      }
      return { status: "ERROR", error: "CONNECTION_FAILED" }
    }
  }

  async getRates(context: ShipmentContext): Promise<ProviderRate[]> {
    this.requireConfigured()
    
    // Safety check: skip digital carts if they somehow reach here. (Though Router should handle it)
    if (context.items && context.items.every((i: any) => i.isDigital)) {
      return []
    }

    const pickupPostcode = context.origin?.postalCode
    const deliveryPostcode = context.destination?.postalCode
    
    if (!pickupPostcode || !deliveryPostcode) {
      console.warn("[PAL][Shiprocket] Missing postal codes for serviceability/rate check")
      return []
    }

    // Default weight is 0.5kg if not provided
    const weight = context.packages?.reduce((acc: number, pkg: any) => acc + (pkg.weight || 0.5), 0) || 0.5

    try {
      // Endpoint: /courier/serviceability/
      // Requires pickup_postcode, delivery_postcode, weight, cod (0 for prepaid)
      const params = new URLSearchParams({
        pickup_postcode: pickupPostcode,
        delivery_postcode: deliveryPostcode,
        weight: weight.toString(),
        cod: "0" 
      })

      const response = await this.client.request(`/courier/serviceability/?${params.toString()}`, {
        method: "GET"
      })

      if (!response.data || !response.data.available_courier_companies) {
        return []
      }

      const couriers = response.data.available_courier_companies

      return couriers.map((courier: any) => ({
        serviceId: courier.courier_company_id.toString(),
        serviceName: courier.courier_name,
        amount: courier.rate,
        currency: "INR", // Shiprocket domestic returns INR by default
        estimatedDeliveryDate: courier.etd ? new Date(courier.etd) : undefined,
        metadata: {
          shiprocket_courier_id: courier.courier_company_id,
          rating: courier.rating,
          estimated_delivery_days: courier.estimated_delivery_days
        }
      }))
    } catch (err: any) {
      console.warn(`[PAL][Shiprocket] getRates failed: ${err.message}`)
      return [] // Failure isolation: do not crash the orchestrator
    }
  }

  async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    this.requireConfigured()

    // 1. Payment Mode Validation
    if (context.metadata?.payment_type === "COD" || context.metadata?.payment_mode === "COD") {
      throw new Error("PAYMENT_MODE_NOT_SUPPORTED")
    }

    // 2. Multi-package check
    if (context.packages && context.packages.length > 1) {
      throw new Error("MULTI_PACKAGE_NOT_SUPPORTED")
    }

    // 3. Extract Courier ID
    const courierId = context.metadata?.shiprocket_courier_id
    if (!courierId) {
      throw new Error("MISSING_COURIER_ID")
    }

    // 4. Pickup Location Mapping
    const locationId = (context.metadata?.location_id || context.origin?.address_id) as string
    const pickupLocation = this.client.config.pickupLocationMap?.[locationId]
    if (!pickupLocation) {
      throw new Error(`MISSING_PICKUP_LOCATION: No Shiprocket pickup location mapped for stock location ${locationId}`)
    }

    // 5. Idempotent Booking Flow
    let orderId = context.metadata?.shiprocket_order_id as number | undefined
    let shipmentId = context.metadata?.shiprocket_shipment_id as number | undefined
    let awbCode = context.metadata?.shiprocket_awb_code as string | undefined
    let labelUrl = context.metadata?.shiprocket_label_url as string | undefined
    let pickupDate = context.metadata?.shiprocket_pickup_date as string | undefined

    // A. Create Order
    if (!orderId || !shipmentId) {
      const pkg = context.packages?.[0] || { weight: 0.5, length: 10, width: 10, height: 10 }
      const orderPayload = {
        order_id: context.orderId,
        order_date: new Date().toISOString().split("T")[0],
        pickup_location: pickupLocation,
        billing_customer_name: context.destination?.company || "Customer",
        billing_last_name: "",
        billing_address: context.destination?.address1 || "Address",
        billing_address_2: context.destination?.address2 || "",
        billing_city: context.destination?.city || "City",
        billing_pincode: context.destination?.postalCode || "110020",
        billing_state: context.destination?.province || "Delhi",
        billing_country: context.destination?.countryCode || "India",
        billing_email: "noreply@organiccanada.com",
        billing_phone: "9999999999",
        shipping_is_billing: true,
        order_items: context.items?.map(i => ({
          name: i.description || "Merchandise",
          sku: i.variantId || "SKU",
          units: i.quantity || 1,
          selling_price: i.unitValue || 0,
        })) || [{ name: "Merchandise", sku: "SKU", units: 1, selling_price: context.declaredValue || 0 }],
        payment_method: "Prepaid",
        sub_total: context.declaredValue || 0,
        length: pkg.length || 10,
        breadth: pkg.width || 10,
        height: pkg.height || 10,
        weight: pkg.weight || 0.5
      }

      const orderRes = await this.client.createOrder(orderPayload)
      orderId = orderRes.order_id
      shipmentId = orderRes.shipment_id
    }

    // B. Assign AWB
    if (!awbCode) {
      let awbRes: any
      try {
        awbRes = await this.client.assignAwb({
          shipment_id: shipmentId,
          courier_id: courierId
        })
      } catch (err: any) {
        const customErr = new Error(`Shiprocket AWB Assignment Failed: ${err.message}`)
        ;(customErr as any).metadata = {
          ...context.metadata,
          shiprocket_order_id: orderId,
          shiprocket_shipment_id: shipmentId,
          shiprocket_courier_id: courierId
        }
        throw customErr
      }
      
      if (awbRes.awb_assign_status !== 1) {
         const customErr = new Error(`Shiprocket AWB Assignment Failed: ${awbRes.message || "Unknown error"}`)
         ;(customErr as any).metadata = {
           ...context.metadata,
           shiprocket_order_id: orderId,
           shiprocket_shipment_id: shipmentId,
           shiprocket_courier_id: courierId
         }
         throw customErr
      }
      awbCode = awbRes.response?.data?.awb_code
    }

    // C. Generate Label
    if (!labelUrl) {
       try {
         const labelRes = await this.client.generateLabel({ shipment_id: [shipmentId] })
         labelUrl = labelRes.label_url
       } catch (err: any) {
         console.warn("[PAL][Shiprocket] Failed to generate label, continuing...", err.message)
       }
    }

    // D. Request Pickup
    if (!pickupDate) {
       try {
         const pickupRes = await this.client.requestPickup({ shipment_id: [shipmentId] })
         pickupDate = pickupRes.pickup_scheduled_date
       } catch (err: any) {
         console.warn("[PAL][Shiprocket] Failed to request pickup, continuing...", err.message)
       }
    }

    return {
      trackingNumber: awbCode || "",
      labels: labelUrl ? [labelUrl] : [],
      metadata: {
        ...context.metadata,
        shiprocket_order_id: orderId,
        shiprocket_shipment_id: shipmentId,
        shiprocket_awb_code: awbCode,
        shiprocket_label_url: labelUrl,
        shiprocket_pickup_date: pickupDate,
        shiprocket_courier_id: courierId
      }
    }
  }

  async cancelShipment(trackingNumber: string, metadata?: Record<string, unknown>): Promise<boolean> {
    this.requireConfigured()
    const orderId = metadata?.shiprocket_order_id
    if (!orderId) {
      console.warn("[PAL][Shiprocket] Cannot cancel shipment without shiprocket_order_id in metadata")
      return false
    }
    
    try {
      const cancelRes = await this.client.cancelOrder({ ids: [orderId] })
      return cancelRes.status_code === 200
    } catch (err) {
      console.error("[PAL][Shiprocket] Cancellation failed:", err)
      return false
    }
  }

  async getTracking(trackingNumber: string): Promise<any> {
    throw new Error("ShiprocketAdapter.getTracking NOT_IMPLEMENTED (Phase C)")
  }
}
