import { TradeClassifier } from "../trade-classifier"
import { TransportModeEngine } from "../transport-mode"
import { ProviderRegistry } from "../provider-registry"
import { ProviderRouter } from "../provider-router"
import { StatusEngine } from "../status-engine"
import { ShipmentContext } from "../../types"

describe("PAL Core Engines", () => {
  const tradeClassifier = new TradeClassifier("CA")
  const transportModeEngine = new TransportModeEngine()
  const statusEngine = new StatusEngine()

  describe("TradeClassifier", () => {
    it("Scenario 1: B2C Domestic CA -> CA", () => {
      const context = {
        origin: { countryCode: "CA" },
        destination: { countryCode: "CA" },
        orderType: "B2C"
      } as ShipmentContext

      const result = tradeClassifier.classify(context)
      expect(result.tradeType).toBe("DOMESTIC")
      expect(result.tradeDirection).toBe("DOMESTIC")
    })

    it("Scenario 2: B2C Export CA -> US", () => {
      const context = {
        origin: { countryCode: "CA" },
        destination: { countryCode: "US" },
        orderType: "B2C"
      } as ShipmentContext

      const result = tradeClassifier.classify(context)
      expect(result.tradeType).toBe("CROSS_BORDER")
      expect(result.tradeDirection).toBe("EXPORT")
    })

    it("Scenario 3: B2B Domestic CA -> CA", () => {
      const context = {
        origin: { countryCode: "CA" },
        destination: { countryCode: "CA" },
        orderType: "B2B"
      } as ShipmentContext

      const result = tradeClassifier.classify(context)
      expect(result.tradeType).toBe("DOMESTIC")
      expect(result.tradeDirection).toBe("DOMESTIC")
    })

    it("Scenario 4: B2B Export CA -> US", () => {
      const context = {
        origin: { countryCode: "CA" },
        destination: { countryCode: "US" },
        orderType: "B2B"
      } as ShipmentContext

      const result = tradeClassifier.classify(context)
      expect(result.tradeType).toBe("CROSS_BORDER")
      expect(result.tradeDirection).toBe("EXPORT")
    })
  })

  describe("TransportModeEngine", () => {
    it("Determines PARCEL for light B2C shipments", () => {
      const context = {
        orderType: "B2C",
        packages: [{ id: "1", packageType: "box", weight: 5, quantity: 1 }]
      } as ShipmentContext
      const result = transportModeEngine.determineMode(context)
      expect(result.transportMode).toBe("PARCEL")
    })

    it("Determines LTL for heavy B2B Domestic shipments", () => {
      const context = {
        orderType: "B2B",
        tradeType: "DOMESTIC",
        destination: { countryCode: "CA" },
        packages: [{ id: "1", packageType: "pallet", weight: 500, quantity: 2 }] // total 1000kg
      } as ShipmentContext
      const result = transportModeEngine.determineMode(context)
      expect(result.transportMode).toBe("LTL")
    })
  })

  describe("ProviderRouter", () => {
    it("Filters unsupported providers", () => {
      const registry = new ProviderRegistry()
      registry.register({
        id: "fedex",
        code: "fedex",
        name: "FedEx",
        priority: 1,
        capabilities: {
          transportModes: ["PARCEL"],
          domestic: true,
          crossBorder: true,
          rating: true,
          booking: true,
          tracking: true,
          label: true,
          customs: true
        }
      })
      registry.register({
        id: "freight_co",
        code: "freight_co",
        name: "Freight Co",
        priority: 2,
        capabilities: {
          transportModes: ["LTL"],
          domestic: true,
          crossBorder: false,
          rating: true,
          booking: true,
          tracking: true,
          label: true,
          customs: false
        }
      })

      const router = new ProviderRouter(registry)

      // Test PARCEL + CROSS_BORDER
      const result1 = router.route({
        transportMode: "PARCEL",
        tradeType: "CROSS_BORDER"
      } as ShipmentContext)
      expect(result1?.id).toBe("fedex")

      // Test LTL + DOMESTIC
      const result2 = router.route({
        transportMode: "LTL",
        tradeType: "DOMESTIC"
      } as ShipmentContext)
      expect(result2?.id).toBe("freight_co")

      // Test LTL + CROSS_BORDER (No provider can do this)
      const result3 = router.route({
        transportMode: "LTL",
        tradeType: "CROSS_BORDER"
      } as ShipmentContext)
      expect(result3).toBeUndefined()
    })

    it("Respects Vendor overrides", () => {
      const registry = new ProviderRegistry()
      registry.register({ id: "canada-post", code: "cp", name: "Canada Post", priority: 1, capabilities: { transportModes: ["PARCEL"], domestic: true, crossBorder: false, rating: true, booking: true, tracking: true, label: true, customs: false } })
      registry.register({ id: "fedex-freight", code: "fxfrt", name: "FedEx Freight", priority: 2, capabilities: { transportModes: ["PARCEL", "LTL"], domestic: true, crossBorder: true, rating: true, booking: true, tracking: true, label: true, customs: true } })

      const router = new ProviderRouter(registry)
      
      // By default, Canada Post is priority 1 for PARCEL Domestic
      const defaultChoice = router.route({ transportMode: "PARCEL", tradeType: "DOMESTIC" } as ShipmentContext)
      expect(defaultChoice?.id).toBe("canada-post")
      
      // But Vendor Orchard 2 demands FedEx Freight
      const overriddenChoice = router.route(
        { transportMode: "PARCEL", tradeType: "DOMESTIC", vendorId: "VENDOR_ORCHARD_2" } as ShipmentContext,
        { preferredProviders: ["fedex-freight"] }
      )
      expect(overriddenChoice?.id).toBe("fedex-freight")
    })
  })

  describe("StatusEngine", () => {
    it("Validates successful transitions", () => {
      expect(statusEngine.canTransition("CREATED", "ACCEPTED")).toBe(true)
      expect(statusEngine.canTransition("BOOKED", "PICKED_UP")).toBe(true)
      expect(statusEngine.canTransition("IN_TRANSIT", "DELIVERED")).toBe(true)
    })

    it("Rejects invalid transitions", () => {
      expect(statusEngine.canTransition("CREATED", "DELIVERED")).toBe(false)
      expect(statusEngine.canTransition("CANCELLED", "BOOKED")).toBe(false)
      
      expect(() => statusEngine.validateTransition("CREATED", "DELIVERED")).toThrowError()
    })
  })
})
