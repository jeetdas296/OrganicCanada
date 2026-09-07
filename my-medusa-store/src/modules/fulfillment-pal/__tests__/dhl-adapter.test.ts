import { DhlAdapter } from "../providers/organic-canada/adapters/dhl"
import { ShipmentContext } from "../types"

describe("DHL Adapter Integration", () => {
  describe("Missing Configuration", () => {
    it("returns NOT_CONFIGURED when missing credentials", () => {
      const adapter = new DhlAdapter({ enabled: true, apiUsername: "", apiPassword: "" })
      expect(adapter.getStatus()).toBe("NOT_CONFIGURED")
    })

    it("throws error when fetching rates without config", async () => {
      const adapter = new DhlAdapter({ enabled: true, apiUsername: "", apiPassword: "" })
      const context = {} as ShipmentContext
      await expect(adapter.getRates(context)).rejects.toThrow("PROVIDER_NOT_CONFIGURED")
    })
  })

  describe("Four Scenarios Validation", () => {
    const validConfig = {
      enabled: true,
      environment: "test",
      apiUsername: "testuser",
      apiPassword: "testpassword",
      accountNumber: "123456789"
    }
    const adapter = new DhlAdapter(validConfig)

    it("B2C Domestic (No customs required)", () => {
      const context: ShipmentContext = {
        shipmentId: "test-id",
        orderId: "order-1",
        orderType: "B2C",
        tradeType: "DOMESTIC",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "CA", city: "Vancouver" },
        packages: [{ id: "p1", quantity: 1, packageType: "box", weight: 5 }],
        items: []
      }
      // Accessing private mapContextToDhlPayload for unit testing validation
      const payload = (adapter as any).mapContextToDhlPayload(context)
      expect(payload.isCustomsDeclarable).toBe(false)
      expect(payload.content?.exportDeclaration).toBeUndefined()
    })

    it("B2C Cross-Border (Requires Customs)", () => {
      const context: ShipmentContext = {
        shipmentId: "test-id",
        orderId: "order-1",
        orderType: "B2C",
        tradeType: "CROSS_BORDER",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "US", city: "New York" },
        packages: [{ id: "p1", quantity: 1, packageType: "box", weight: 5 }],
        items: [],
        metadata: {
          customsDeclaration: {
            description: "Cross Border Goods",
            invoiceNumber: "INV-001"
          }
        }
      }
      
      const payload = (adapter as any).mapContextToDhlPayload(context)
      expect(payload.isCustomsDeclarable).toBe(true)
      
      // when creating shipment payload, exportDeclaration should be appended
    })

    it("Throws error if Customs is missing for Cross-Border", async () => {
      const context: ShipmentContext = {
        shipmentId: "test-id",
        orderId: "order-1",
        orderType: "B2C",
        tradeType: "CROSS_BORDER",
        origin: { countryCode: "CA", city: "Toronto" },
        destination: { countryCode: "US", city: "New York" },
        packages: [{ id: "p1", quantity: 1, packageType: "box", weight: 5 }],
        items: []
      }
      
      await expect(adapter.bookShipment(context)).rejects.toThrow("Missing customs declaration")
    })
  })
})
