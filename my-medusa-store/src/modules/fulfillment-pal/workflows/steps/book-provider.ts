import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ShipmentContext } from "../../types"
import { ProviderRegistry } from "../../core"
import { CanadaPostAdapter, FedExFreightAdapter, FlexportAdapter } from "../../providers/adapters"
import { OrganicCanadaProviderService } from "../../providers/organic-canada"
import { FULFILLMENT_PAL_MODULE } from "../../index"
import { organicCanadaConfig } from "../../providers/organic-canada/config"

export const bookProviderStepId = "book-provider-step"

export const bookProviderStep = createStep(
  bookProviderStepId,
  async (input: { context: ShipmentContext, providerId: string }, { container }) => {
    const palService = container.resolve(FULFILLMENT_PAL_MODULE)

    // 1. Idempotency Check
    const existingBookings = await palService.listPalProviderBookings({
      shipment_id: input.context.shipmentId
    })

    let existingPartialBookingId: string | null = null

    if (existingBookings && existingBookings.length > 0) {
      const booking = existingBookings[0]
      const responsePayload = booking.response_payload || {}
      
      // We must only return early if the booking is fully complete.
      if (booking.status === "BOOKED" && booking.external_booking_id && booking.external_booking_id !== "NOT_BOOKED" && booking.external_booking_id !== "PARTIAL" && booking.external_booking_id !== "unknown") {
        return new StepResponse({
          providerId: input.providerId,
          trackingNumber: booking.external_booking_id,
          labels: responsePayload.labels || [],
          cost: responsePayload.cost,
          status: "BOOKED"
        })
      }
      
      // For partial or failed bookings, merge persisted metadata into context
      if (responsePayload.metadata) {
        input.context.metadata = {
          ...(input.context.metadata || {}),
          ...(responsePayload.metadata as any)
        }
      }
      
      existingPartialBookingId = booking.id
    }

    // 2. Resolve database configuration for carriers
    const providers = await palService.listPalProviders({ code: "ORGANIC_CANADA" })
    let dbConfig = providers[0]?.configuration
    if (!dbConfig) {
      dbConfig = { carriers: organicCanadaConfig.carriers }
    }

    const registry = new ProviderRegistry()
    registry.register({ id: "organic_canada", code: "ORGANIC_CANADA", name: "Organic Canada Logistics", priority: 1, capabilities: {} as any, adapter: new OrganicCanadaProviderService(dbConfig) })
    registry.register({ id: "canada-post", code: "cp", name: "Canada Post (MOCK - TEST ONLY)", priority: 10, capabilities: {} as any, adapter: new CanadaPostAdapter() })
    registry.register({ id: "fedex-freight", code: "fxfrt", name: "FedEx Freight (MOCK - TEST ONLY)", priority: 20, capabilities: {} as any, adapter: new FedExFreightAdapter() })
    registry.register({ id: "flexport", code: "flx", name: "Flexport (MOCK - TEST ONLY)", priority: 30, capabilities: {} as any, adapter: new FlexportAdapter() })
    
    const providerRegistration = registry.getProvider(input.providerId)
    
    if (!providerRegistration || !providerRegistration.adapter) {
      throw new Error(`Failed to resolve provider adapter for ${input.providerId}`)
    }
    
    // 3. Delegate booking execution to the resolved provider adapter
    let result: any = null
    try {
      result = await providerRegistration.adapter.createShipment(input.context)
    } catch (error: any) {
      if (error.message === "PROVIDER_NOT_CONFIGURED" || error.message === "NO_PROVIDER_CONNECTION") {
        // Retrieve and verify the shipment's selected provider is organic_canada
        if (!input.context.shipmentId) {
          throw new Error("Cannot retrieve shipment details without a valid shipmentId")
        }
        const shipment = await palService.retrievePalShipment(input.context.shipmentId)
        if (!shipment) {
          throw new Error(`Shipment ${input.context.shipmentId} not found in database`)
        }
        if (shipment.selected_provider_id !== "organic_canada") {
          throw new Error(`Shipment ${input.context.shipmentId} has selected provider ${shipment.selected_provider_id}, expected organic_canada`)
        }

        console.warn(`[PAL] Provider ${input.providerId} is not configured or no connection available.`)
        // Persist a NOT_BOOKED record so the UI knows exactly why it's unbooked
        console.log(`[PAL_BOOKING] Attempting to create NOT_BOOKED booking with provider_id: ${input.providerId}`)
        // Find the actual DB ID of the provider
        const dbProviders = await palService.listPalProviders({ code: "ORGANIC_CANADA" })
        const dbProviderId = dbProviders[0]?.id || input.providerId

        try {
          await palService.createPalProviderBookings({
            shipment_id: input.context.shipmentId,
            provider_id: dbProviderId,
            external_booking_id: "NOT_BOOKED",
            external_shipment_id: "NOT_BOOKED",
            status: "NOT_BOOKED",
            response_payload: { error: error.message },
            booked_at: new Date()
          })
          console.log(`[PAL_BOOKING] Successfully created booking.`)
        } catch (e: any) {
          console.error(`[PAL_BOOKING] Error creating booking: ${e.message}`)
          throw e
        }
        
        return new StepResponse({
          providerId: input.providerId,
          trackingNumber: null,
          labels: [],
          cost: 0,
          status: "CREATED" // Keep PAL Shipment as CREATED since Carrier is NOT_CONFIGURED
        })
      }
      if (error.metadata) {
        const dbProviders = await palService.listPalProviders({ code: "ORGANIC_CANADA" })
        const dbProviderId = dbProviders[0]?.id || input.providerId
        
        if (existingPartialBookingId) {
          await palService.updatePalProviderBookings({
            id: existingPartialBookingId,
            status: "PARTIAL_BOOKED",
            external_booking_id: "PARTIAL",
            external_shipment_id: "PARTIAL",
            response_payload: { error: error.message, metadata: error.metadata },
            booked_at: new Date()
          })
        } else {
          await palService.createPalProviderBookings({
            shipment_id: input.context.shipmentId,
            provider_id: dbProviderId,
            external_booking_id: "PARTIAL",
            external_shipment_id: "PARTIAL",
            status: "PARTIAL_BOOKED",
            response_payload: { error: error.message, metadata: error.metadata },
            booked_at: new Date()
          })
        }
      }
      throw error // Re-throw other errors
    }
    
    // Find the actual DB ID of the provider for the success case
    const dbProviders = await palService.listPalProviders({ code: "ORGANIC_CANADA" })
    const dbProviderId = dbProviders[0]?.id || input.providerId

    // 4. Database Persistence: persist the booking details
    if (existingPartialBookingId) {
      await palService.updatePalProviderBookings({
        id: existingPartialBookingId,
        external_booking_id: result.trackingNumber,
        external_shipment_id: result.trackingNumber,
        status: "BOOKED",
        response_payload: {
          cost: result.cost,
          currency: result.currency,
          labels: result.labels,
          metadata: result.metadata
        },
        booked_at: new Date()
      })
    } else {
      await palService.createPalProviderBookings({
        shipment_id: input.context.shipmentId,
        provider_id: dbProviderId,
        external_booking_id: result.trackingNumber,
        external_shipment_id: result.trackingNumber,
        status: "BOOKED",
        response_payload: {
          cost: result.cost,
          currency: result.currency,
          labels: result.labels,
          metadata: result.metadata
        },
        booked_at: new Date()
      })
    }

    return new StepResponse({
      providerId: input.providerId,
      trackingNumber: result.trackingNumber,
      labels: result.labels,
      cost: result.cost,
      status: "BOOKED"
    })
  }
)
