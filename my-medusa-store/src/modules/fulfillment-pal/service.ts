import { MedusaService } from "@medusajs/framework/utils"
import {
  PalShipment,
  PalShipmentItem,
  PalShipmentAddress,
  PalPackage,
  PalTransport,
  PalProvider,
  PalProviderCapability,
  PalProviderService,
  PalProviderBooking,
  PalTrackingEvent,
  PalShipmentStatusHistory,
  PalComplianceRecord,
  PalCustomsDeclaration,
  PalCustomsItem,
  PalDocument,
  PalDocumentRequirement,
  PalCountryRule,
  PalIncoterm,
  PalShippingRule,
  PalVendorShippingConfig,
  PalVendorLocation,
  PalShipmentEvent,
  PalShipmentTimeline,
  PalShipmentTimelineStep,
} from "./models"

class FulfillmentPalModuleService extends MedusaService({
  PalShipment,
  PalShipmentItem,
  PalShipmentAddress,
  PalPackage,
  PalTransport,
  PalProvider,
  PalProviderCapability,
  PalProviderService,
  PalProviderBooking,
  PalTrackingEvent,
  PalShipmentStatusHistory,
  PalComplianceRecord,
  PalCustomsDeclaration,
  PalCustomsItem,
  PalDocument,
  PalDocumentRequirement,
  PalCountryRule,
  PalIncoterm,
  PalShippingRule,
  PalVendorShippingConfig,
  PalVendorLocation,
  PalShipmentEvent,
  PalShipmentTimeline,
  PalShipmentTimelineStep,
}) {
  static instance: FulfillmentPalModuleService;

  constructor(...args: any[]) {
    // @ts-ignore
    super(...args)
    FulfillmentPalModuleService.instance = this
    console.log("[FULFILLMENT_PAL] FulfillmentPalModuleService instance set globally:", !!this)
  }
}

export default FulfillmentPalModuleService
