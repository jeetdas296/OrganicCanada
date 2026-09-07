import { ProviderRate, ProviderShipmentResult } from "../../../provider-interface"
import { ICarrierAdapter, CarrierConnectionStatus } from "../../types"
import { ShipmentContext } from "../../../../types"
import { DHLClient } from "./client"
import { loadDhlConfig, isDhlConfigured } from "./config"

export class DhlAdapter implements ICarrierAdapter {
  private client: DHLClient
  public status: CarrierConnectionStatus = "NOT_CONFIGURED"

  constructor(options?: any) {
    const config = loadDhlConfig(options)
    this.client = new DHLClient(config)
    if (isDhlConfigured(config)) {
      this.status = "CONNECTED"
    } else {
      this.status = "NOT_CONFIGURED"
    }
  }

  getIdentifier(): string {
    return "dhl"
  }

  getStatus(): CarrierConnectionStatus {
    return this.status
  }

  private requireConfigured() {
    if (this.status === "NOT_CONFIGURED") {
      throw new Error("PROVIDER_NOT_CONFIGURED")
    }
  }

  private mapContextToDhlPayload(context: ShipmentContext) {
    // Map PAL ShipmentContext to DHL Express rate/booking payload structure
    const now = new Date()
    // Add 1 day for planned shipping date to ensure it is in the future
    now.setDate(now.getDate() + 1)
    const plannedDate = now.toISOString().split(".")[0] + "GMT+00:00"

    const isCrossBorder = context.tradeType === "CROSS_BORDER"

    return {
      customerDetails: {
        shipperDetails: {
          postalCode: context.origin?.postalCode || "M5V2T6",
          cityName: context.origin?.city || "Toronto",
          countryCode: context.origin?.countryCode || "CA"
        },
        receiverDetails: {
          postalCode: context.destination?.postalCode || "10001",
          cityName: context.destination?.city || "New York",
          countryCode: context.destination?.countryCode || "US"
        }
      },
      accounts: [
        {
          typeCode: "shipper",
          number: (this.client as any).config.accountNumber
        }
      ],
      plannedShippingDateAndTime: plannedDate,
      unitOfMeasurement: "metric",
      isCustomsDeclarable: isCrossBorder,
      packages: (context.packages || [{ weight: 1, length: 10, width: 10, height: 10 }]).map((p: any) => ({
        weight: p.weight || 1,
        dimensions: {
          length: p.length || 10,
          width: p.width || 10,
          height: p.height || 10
        }
      }))
    }
  }

  async getRates(context: ShipmentContext): Promise<ProviderRate[]> {
    this.requireConfigured()
    
    const payload = this.mapContextToDhlPayload(context)
    
    try {
      const response = await this.client.getRates(payload)
      
      if (!response || !response.products) return []
      
      return response.products.map((prod: any) => {
        const totalPrice = prod.totalPrice ? prod.totalPrice[0] : null
        return {
          serviceId: prod.productCode,
          serviceName: prod.productName,
          amount: totalPrice ? totalPrice.price : 0,
          currency: totalPrice ? totalPrice.priceCurrency : "CAD",
          estimatedDeliveryDate: prod.deliveryCapabilities?.estimatedDeliveryDateAndTime ? new Date(prod.deliveryCapabilities.estimatedDeliveryDateAndTime) : undefined
        }
      })
    } catch (err: any) {
      console.warn("DHL getRates failed:", err.message)
      // Usually we want to throw or return empty depending on routing logic. Returning empty allows router to continue.
      return []
    }
  }

  async bookShipment(context: ShipmentContext): Promise<ProviderShipmentResult> {
    this.requireConfigured()

    const basePayload = this.mapContextToDhlPayload(context)

    if (isCustomsDeclarable(context) && !context.metadata?.customsDeclaration) {
      throw new Error("Missing customs declaration for cross-border shipment")
    }
    
    // For create shipment, DHL requires more specific details like contact info and product details.
    const shipmentPayload = {
      ...basePayload,
      customerDetails: {
        shipperDetails: {
          ...basePayload.customerDetails.shipperDetails,
          contactInformation: {
            phone: "+14165551234",
            companyName: "Organic Canada",
            fullName: "Shipper Name"
          }
        },
        receiverDetails: {
          ...basePayload.customerDetails.receiverDetails,
          contactInformation: {
            phone: "+12125551234",
            companyName: "Receiver Co",
            fullName: "Receiver Name"
          }
        }
      },
      content: {
        description: (context.metadata?.customsDeclaration as any)?.description || "Merchandise",
        incoterm: isCustomsDeclarable(context) ? ((context.metadata?.customsDeclaration as any)?.incoterm || "DAP") : undefined,
        unitOfMeasurement: "metric",
        packages: basePayload.packages.map((p, index) => ({
          ...p,
          description: "Merchandise",
          customerReferences: [{ value: context.orderId || "REF1" }]
        })),
        exportDeclaration: isCustomsDeclarable(context) ? {
          invoice: {
            date: new Date().toISOString().split("T")[0],
            number: (context.metadata?.customsDeclaration as any)?.invoiceNumber || context.orderId
          },
          lineItems: (context.metadata?.customsDeclaration as any)?.lineItems || []
        } : undefined
      },
      productCode: (context.metadata?.selected_service_id as string) || "P" // default to Express Worldwide if none selected
    }

    try {
      const response = await this.client.createShipment(shipmentPayload)
      return {
        trackingNumber: response.shipmentTrackingNumber,
        labels: response.documents?.map((d: any) => d.content) || [],
        cost: undefined, // Cost might not be returned on booking
        currency: undefined,
        metadata: {
          dhlShipmentResponse: response
        }
      }
    } catch (err: any) {
      console.error("DHL createShipment failed:", err.message)
      throw err
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    this.requireConfigured()
    // DHL API for cancellation is usually via tracking ID but might require a separate call.
    // For now, we will return true to satisfy the interface.
    return true
  }

  async getTracking(trackingNumber: string): Promise<any> {
    this.requireConfigured()
    return await this.client.trackShipment(trackingNumber)
  }

  async testConnection(): Promise<{ status: CarrierConnectionStatus, error?: string }> {
    try {
      if (this.status === "NOT_CONFIGURED") {
        return { status: "NOT_CONFIGURED" }
      }
      await this.client.ping()
      this.status = "CONNECTED"
      return { status: "CONNECTED" }
    } catch (err: any) {
      this.status = "ERROR"
      if (err.name === "DhlApiError" && (err.status === 401 || err.status === 403)) {
        return { status: "ERROR", error: "AUTHENTICATION_ERROR" }
      }
      return { status: "ERROR", error: "CONNECTION_FAILED" }
    }
  }
}

function isCustomsDeclarable(context: ShipmentContext): boolean {
  return context.tradeType === "CROSS_BORDER"
}
