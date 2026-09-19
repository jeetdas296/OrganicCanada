import { ShipmentContext } from "../../types"

export class CustomsEngine {
  public generateComplianceDocuments(context: ShipmentContext): ShipmentContext {
    if (context.tradeType !== "CROSS_BORDER") {
      return context
    }

    // Validation is deferred to timeline configuration (CUSTOMS_PREPARATION step)
    // to allow initial shipment creation without forcing the vendor to have all
    // customs data available upfront.

    const documents: any[] = []

    // 3. Generate Commercial Invoice
    documents.push(this.generateCommercialInvoice(context))

    // 4. Generate Customs Declaration
    documents.push(this.generateCustomsDeclaration(context))

    // 5. Generate Packing List (B2B Cross-Border only)
    if (context.orderType === "B2B") {
      documents.push(this.generatePackingList(context))
    }

    // Avoid duplicating documents if called multiple times (idempotency safety check)
    // Actually, since this is a new run, we replace the previous customsDocuments if they existed.
    // The previous run's metadata won't be duplicated in the array.
    const existingMetadata = context.metadata || {}
    return {
      ...context,
      metadata: {
        ...existingMetadata,
        customsDocuments: documents
      }
    }
  }

  private generateCommercialInvoice(context: ShipmentContext) {
    const totalValue = (context.items || []).reduce((sum, item) => sum + (item.totalValue || (item.unitValue * item.quantity) || 0), 0)

    return {
      documentType: "COMMERCIAL_INVOICE",
      format: "JSON_DATA",
      data: {
        shipmentId: context.shipmentId,
        orderId: context.orderId,
        originCountry: context.origin?.countryCode,
        destinationCountry: context.destination?.countryCode,
        currency: context.currency || context.items?.[0]?.currency,
        totalValue: totalValue,
        incoterm: context.incoterm,
        lineItems: (context.items || []).map(item => ({
          id: item.id,
          sku: item.variantId || item.productId,
          description: item.description || "Merchandise",
          quantity: item.quantity,
          unitValue: item.unitValue,
          totalValue: item.totalValue || (item.unitValue * item.quantity),
          hsCode: item.hsCode,
          countryOfOrigin: item.countryOfOrigin || context.origin?.countryCode
        }))
      },
      generatedAt: new Date().toISOString()
    }
  }

  private generateCustomsDeclaration(context: ShipmentContext) {
    const totalValue = (context.items || []).reduce((sum, item) => sum + (item.totalValue || (item.unitValue * item.quantity) || 0), 0)
    const totalWeight = (context.packages || []).reduce((sum, pkg) => sum + ((pkg.weight || 0) * pkg.quantity), 0)

    return {
      documentType: "CUSTOMS_PREPARATION",
      format: "JSON_DATA",
      data: {
        shipmentId: context.shipmentId,
        originCountry: context.origin?.countryCode,
        destinationCountry: context.destination?.countryCode,
        incoterm: context.incoterm,
        totalValue,
        totalWeight,
        currency: context.currency || context.items?.[0]?.currency,
        packages: (context.packages || []).map(pkg => ({
          packageType: pkg.packageType,
          weight: pkg.weight,
          weightUnit: pkg.weightUnit
        })),
        lineItems: (context.items || []).map(item => ({
          description: item.description || "Merchandise",
          sku: item.variantId || item.productId,
          quantity: item.quantity,
          unitValue: item.unitValue,
          hsCode: item.hsCode,
          countryOfOrigin: item.countryOfOrigin || context.origin?.countryCode
        }))
      },
      generatedAt: new Date().toISOString()
    }
  }

  private generatePackingList(context: ShipmentContext) {
    return {
      documentType: "PACKING_LIST",
      format: "JSON_DATA",
      data: {
        shipmentId: context.shipmentId,
        orderId: context.orderId,
        packages: (context.packages || []).map(pkg => ({
          id: pkg.id,
          packageType: pkg.packageType,
          quantity: pkg.quantity,
          dimensions: {
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            unit: pkg.dimensionUnit
          },
          weight: {
            value: pkg.weight,
            unit: pkg.weightUnit
          }
        })),
        lineItems: (context.items || []).map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          weight: item.weight
        }))
      },
      generatedAt: new Date().toISOString()
    }
  }
}
