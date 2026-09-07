import { asValue } from "awilix"
import { AbstractFulfillmentProviderService, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { processPalShipmentWorkflow } from "../workflows/process-pal-shipment"
import FulfillmentPalModuleService from "../service"
import { FULFILLMENT_PAL_MODULE } from "../index"

export class PalFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "organic_canada"
  protected palService: any
  protected container: any

  constructor(container: any) {
    super()
    console.log("[PAL_PROVIDER] PalFulfillmentProviderService instantiated with identifier:", PalFulfillmentProviderService.identifier)
    this.container = container
    try {
      this.palService = container.fulfillmentPal
    } catch (e) {
      // Fallback to static instance at runtime
    }
  }

  async getFulfillmentOptions(): Promise<any[]> {
    return [
      {
        id: "pal-standard",
        name: "PAL Standard Shipping"
      }
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<any> {
    return {
      ...data
    }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async canCalculate(data: any): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    return { price: 1500 }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<any> {
    console.log("[PAL_PROVIDER]", {
      source: "PAL_PROVIDER",
      medusa_provider_id: "organic_canada_organic_canada",
      pal_provider_id: "organic_canada"
    })

    const palService = this.palService || FulfillmentPalModuleService.instance

    // Check if PAL Shipment already exists for this Medusa fulfillment
    const externalRef = fulfillment?.id || "unknown_fulfillment"
    if (externalRef !== "unknown_fulfillment" && palService) {
      const existing = await palService.listPalShipments({ external_reference: externalRef })
      if (existing && existing.length > 0) {
        console.log(`[PAL_PROVIDER] Fulfillment ${externalRef} already processed, returning existing data.`)
        return {
          data: {
            pal_shipment_id: existing[0].id,
            status: existing[0].status
          },
          labels: [] // Labels might not be readily available here, but idempotency is safe
        }
      }
    }

    // 1. Resolve Fulfillment -> location_id -> Stock Location -> Address (Origin)
    const fulfillmentId = fulfillment?.id || "unknown_fulfillment"
    const orderId = order?.id || "unknown_order"
    
    // Attempt to extract addresses from the objects passed by Medusa core
    // Removed fallbacks to prevent false CROSS_BORDER classification
    const originCountry = data?.originCountry as string | null
    const destinationCountry = data?.destinationCountry as string | null
    const orderType = (data?.orderType as string) || "B2C"
    
    const originStockLocationAddress = originCountry ? { country_code: originCountry } : null
    const destinationShippingAddress = destinationCountry ? { country_code: destinationCountry } : null
    
    console.log("[PAL_VERIFY_ORIGIN_DESTINATION]", {
      fulfillmentId,
      fulfillmentLocationId: fulfillment?.location_id,
      originCountry,
      orderId,
      destinationCountry,
      orderType,
    })

    console.log("[PAL_VERIFY_WORKFLOW_INPUT]", {
      originStockLocationAddress,
      destinationShippingAddress,
      orderType,
    })

    // Execute PAL core shipment process workflow:
    // processPalShipmentWorkflow -> selectProviderStep -> ProviderRouter -> Organic Canada Provider
    const runResult = (await processPalShipmentWorkflow().run({
      input: {
        orderId,
        fulfillmentId,
        items: items || [],
        packages: (data?.packages as any[]) || [],
        originStockLocationAddress,
        destinationShippingAddress,
        orderType
      }
    })) as any

    const result = runResult.result

    return {
      data: {
        pal_shipment_id: result?.booking?.trackingNumber || "tmp_pal_shp_123",
        status: result?.statusUpdate?.status || "CREATED"
      },
      labels: result?.booking?.labels ? result.booking.labels.map((l: string) => ({ url: l })) : []
    }
  }

  async cancelFulfillment(
    fulfillmentData: Record<string, unknown>
  ): Promise<any> {
    return {}
  }

  async createReturn(
    returnFulfillment: Record<string, unknown>
  ): Promise<any> {
    return {}
  }

  async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }
}
