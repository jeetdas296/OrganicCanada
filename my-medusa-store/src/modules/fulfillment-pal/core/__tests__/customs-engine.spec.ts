import { CustomsEngine } from "../customs-engine"
import { ShipmentContext } from "../../types"

describe("CustomsEngine Phase 1 Validation", () => {
  let engine: CustomsEngine
  let baseContext: ShipmentContext

  beforeEach(() => {
    engine = new CustomsEngine()
    baseContext = {
      orderId: "ord_123",
      shipmentId: "shp_123",
      orderType: "B2C",
      tradeType: "CROSS_BORDER",
      origin: { countryCode: "CA" },
      destination: { countryCode: "US" },
      currency: "CAD",
      incoterm: "DDP",
      items: [
        {
          id: "item_1",
          quantity: 2,
          unitValue: 10,
          totalValue: 20,
          currency: "CAD",
          hsCode: "1234.56.78",
          description: "Test Item"
        }
      ],
      packages: [
        {
          id: "pkg_1",
          packageType: "box",
          quantity: 1,
          weight: 2,
          weightUnit: "kg"
        }
      ]
    }
  })

  it("1. Domestic shipments bypass generation and validation", () => {
    baseContext.tradeType = "DOMESTIC"
    baseContext.destination = { countryCode: "CA" }
    baseContext.incoterm = undefined // domestic doesn't need it
    baseContext.items[0].hsCode = undefined // domestic doesn't need it

    const result = engine.generateComplianceDocuments(baseContext)
    expect(result).toBe(baseContext)
    expect(result.metadata?.customsDocuments).toBeUndefined()
  })

  it("2. Missing HS Code allows Cross-Border generation (validation deferred)", () => {
    baseContext.items[0].hsCode = ""
    let result = engine.generateComplianceDocuments(baseContext)
    expect(result.metadata?.customsDocuments).toBeDefined()
    
    baseContext.items[0].hsCode = undefined
    result = engine.generateComplianceDocuments(baseContext)
    expect(result.metadata?.customsDocuments).toBeDefined()
  })

  it("3. Missing Incoterm allows Cross-Border generation (validation deferred)", () => {
    baseContext.incoterm = undefined
    let result = engine.generateComplianceDocuments(baseContext)
    expect(result.metadata?.customsDocuments).toBeDefined()
    
    baseContext.incoterm = "   "
    result = engine.generateComplianceDocuments(baseContext)
    expect(result.metadata?.customsDocuments).toBeDefined()
  })

  it("4. B2C Cross-Border generates Commercial Invoice and Customs Declaration", () => {
    const result = engine.generateComplianceDocuments(baseContext)
    
    const docs = result.metadata?.customsDocuments as any[]
    expect(docs).toBeDefined()
    expect(docs.length).toBe(2)
    
    expect(docs.some(d => d.documentType === "COMMERCIAL_INVOICE")).toBe(true)
    expect(docs.some(d => d.documentType === "CUSTOMS_PREPARATION")).toBe(true)
    expect(docs.some(d => d.documentType === "PACKING_LIST")).toBe(false)
  })

  it("5. B2B Cross-Border generates Invoice, Customs Declaration, and Packing List", () => {
    baseContext.orderType = "B2B"
    const result = engine.generateComplianceDocuments(baseContext)
    
    const docs = result.metadata?.customsDocuments as any[]
    expect(docs).toBeDefined()
    expect(docs.length).toBe(3)
    
    expect(docs.some(d => d.documentType === "COMMERCIAL_INVOICE")).toBe(true)
    expect(docs.some(d => d.documentType === "CUSTOMS_PREPARATION")).toBe(true)
    expect(docs.some(d => d.documentType === "PACKING_LIST")).toBe(true)
  })

  it("6. Generated documents are Provider-Independent", () => {
    const result = engine.generateComplianceDocuments(baseContext)
    const docs = result.metadata?.customsDocuments as any[]
    
    const invoice = docs.find(d => d.documentType === "COMMERCIAL_INVOICE")
    
    // There shouldn't be any shiprocket or dhl keys
    const jsonStr = JSON.stringify(invoice)
    expect(jsonStr).not.toMatch(/shiprocket/i)
    expect(jsonStr).not.toMatch(/dhl/i)
    
    expect(invoice.data.originCountry).toBe("CA")
    expect(invoice.data.lineItems[0].hsCode).toBe("1234.56.78")
  })

  it("7. Generated documents support idempotency with existing metadata", () => {
    baseContext.metadata = { existingKey: "value" }
    
    const result = engine.generateComplianceDocuments(baseContext)

    expect(result.metadata?.customsDocuments).toBeDefined()
    expect(result.metadata?.existingKey).toBe("value")
  })
})
