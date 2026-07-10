import { MedusaService } from "@medusajs/framework/utils"
import { ErpMapping } from "./models/erp-mapping"
import { ErpSyncLog } from "./models/erp-sync-log"
import { ERPNextClient, ERPNextConfig } from "./erpnext-client"

class ErpModuleService extends MedusaService({
  ErpMapping,
  ErpSyncLog,
}) {
  protected options_: ERPNextConfig
  protected client: ERPNextClient
  protected logger: any

  constructor({ logger }: { logger: any }, options?: any) {
    super(...arguments)
    this.logger = logger
    this.options_ = {
      enabled: options?.enabled ?? true,
      url: options?.url ?? "",
      apiKey: options?.apiKey ?? "",
      apiSecret: options?.apiSecret ?? "",
      company: options?.company ?? "",
      warehouse: options?.warehouse ?? "",
      priceList: options?.priceList ?? "Standard Selling",
      syncOnOrderPlaced: options?.syncOnOrderPlaced ?? true,
      syncOnProductUpdate: options?.syncOnProductUpdate ?? true,
      syncOnInventoryChange: options?.syncOnInventoryChange ?? true,
      retryAttempts: options?.retryAttempts ?? 5,
      retryBackoffMs: options?.retryBackoffMs ?? 1000,
    }
    this.client = new ERPNextClient(this.options_, this.logger)
  }

  async ping(): Promise<boolean> {
    return await this.client.ping()
  }

  async syncCustomer(customer: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<string> {
    const customerId = customer.id

    // Check if mapping already exists
    const mappings = await this.listErpMappings({
      medusa_entity_type: "customer",
      medusa_id: customerId,
    })
    const existingMapping = mappings[0]

    try {
      const erpName = await this.client.upsertCustomer({
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        name_in_erp: existingMapping?.erp_name,
      })

      if (existingMapping) {
        if (existingMapping.erp_name !== erpName) {
          await this.updateErpMappings({
            selector: {
              id: existingMapping.id,
            },
            data: {
              erp_name: erpName,
            },
          })
        }
      } else {
        await this.createErpMappings({
          medusa_entity_type: "customer",
          medusa_id: customerId,
          erp_doctype: "Customer",
          erp_name: erpName,
        })
      }

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "customer",
        medusa_id: customerId,
        status: "success",
      })

      return erpName
    } catch (error: any) {
      this.logger.error(`[ERPNext] Customer sync failed for ${customerId}: ${error.message}`)

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "customer",
        medusa_id: customerId,
        status: "failed",
        error: error.message,
      })
      throw error
    }
  }

  async syncProductVariant(variant: {
    id: string
    sku: string
    title: string
    product?: {
      title: string
      description?: string
    }
    price?: number // in cents
  }): Promise<string> {
    const variantId = variant.id

    if (!variant.sku) {
      throw new Error(`Product variant ${variantId} does not have a SKU. SKU is required for ERPNext Item sync.`)
    }

    const mappings = await this.listErpMappings({
      medusa_entity_type: "variant",
      medusa_id: variantId,
    })
    const existingMapping = mappings[0]

    try {
      const erpCode = await this.client.upsertItem({
        sku: variant.sku,
        title: `${variant.product?.title || ""} - ${variant.title || ""}`.trim(),
        description: variant.product?.description || undefined,
        price: variant.price,
        is_stock_item: true,
      })

      if (!existingMapping) {
        await this.createErpMappings({
          medusa_entity_type: "variant",
          medusa_id: variantId,
          erp_doctype: "Item",
          erp_name: erpCode,
        })
      }

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "variant",
        medusa_id: variantId,
        status: "success",
      })

      return erpCode
    } catch (error: any) {
      this.logger.error(`[ERPNext] Variant sync failed for ${variantId}: ${error.message}`)

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "variant",
        medusa_id: variantId,
        status: "failed",
        error: error.message,
      })
      throw error
    }
  }

  async syncOrder(
    order: {
      id: string
      customer_id?: string | null
      email?: string | null
      payment_status?: string
      items: Array<{
        variant_id: string
        quantity: number
        unit_price: number
        variant?: {
          sku?: string
          title: string
          product?: {
            title: string
            description?: string
          }
        }
      }>
    },
    customerDetails: {
      email: string
      first_name?: string
      last_name?: string
      phone?: string
    }
  ): Promise<string> {
    const orderId = order.id

    const mappings = await this.listErpMappings({
      medusa_entity_type: "order",
      medusa_id: orderId,
    })
    const existingMapping = mappings[0]
    if (existingMapping) {
      this.logger.info(`[ERPNext] Order ${orderId} is already synced to ERPNext as ${existingMapping.erp_name}.`)
      return existingMapping.erp_name
    }

    try {
      // 1. Sync Customer
      const customerErpName = await this.client.upsertCustomer({
        email: customerDetails.email,
        first_name: customerDetails.first_name,
        last_name: customerDetails.last_name,
        phone: customerDetails.phone,
      })

      // 2. Sync all Item Variants
      // 2. Sync all Item Variants
      const itemsPayload: Array<{ sku: string; qty: number; price: number }> = []

      for (const item of order.items) {
        if (!item.variant_id) {
          throw new Error(`Order item does not have a variant_id. Cannot sync to ERPNext.`)
        }

        const sku = item.variant?.sku
        if (!sku) {
          throw new Error(`Variant ${item.variant_id} does not have a SKU. Cannot sync to ERPNext.`)
        }

        // Robust quantity extraction (Medusa v2 sometimes returns BigNumber-like objects)
        const rawQty: any = (item as any).quantity ?? (item as any).raw_quantity?.value ?? 0
        const qty = Number(rawQty)

        // Robust price extraction
        const rawPrice: any = (item as any).unit_price ?? (item as any).raw_unit_price?.value ?? 0
        const price = Number(rawPrice)

        if (!qty || qty <= 0) {
          throw new Error(`Order item for variant ${item.variant_id} has invalid quantity (${rawQty}).`)
        }

        const erpCode = await this.client.upsertItem({
          sku,
          title: `${item.variant?.product?.title || ""} - ${item.variant?.title || ""}`.trim(),
          description: item.variant?.product?.description || undefined,
          is_stock_item: true,
        })

        itemsPayload.push({
          sku: erpCode,
          qty,
          price,
        })
      }

      // 3. Create Sales Order in ERPNext
      const salesOrderName = await this.client.createSalesOrder({
        customer_erp_name: customerErpName,
        medusa_order_id: orderId,
        items: itemsPayload,
      })

      // 4. Create Sales Invoice if paid
      let salesInvoiceName = ""
      if (order.payment_status === "captured") {
        try {
          salesInvoiceName = await this.client.createSalesInvoice({
            customer_erp_name: customerErpName,
            sales_order_name: salesOrderName,
            items: itemsPayload,
          })
          this.logger.info(`[ERPNext] Created Sales Invoice ${salesInvoiceName} for Order ${orderId}`)
        } catch (invoiceError: any) {
          this.logger.error(`[ERPNext] Failed to create Sales Invoice for Order ${orderId}: ${invoiceError.message}`)
        }
      }

      // 5. Save mappings
      await this.createErpMappings({
        medusa_entity_type: "order",
        medusa_id: orderId,
        erp_doctype: "Sales Order",
        erp_name: salesOrderName,
      })

      if (salesInvoiceName) {
        await this.createErpMappings({
          medusa_entity_type: "invoice",
          medusa_id: orderId,
          erp_doctype: "Sales Invoice",
          erp_name: salesInvoiceName,
        })
      }

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "order",
        medusa_id: orderId,
        status: "success",
      })

      return salesOrderName
    } catch (error: any) {
      this.logger.error(`[ERPNext] Order sync failed for ${orderId}: ${error.message}`)

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "order",
        medusa_id: orderId,
        status: "failed",
        error: error.message,
      })
      throw error
    }
  }

  async syncInventory(inventoryItemId: string, sku: string, totalQty: number): Promise<void> {
    try {
      await this.client.updateStock(sku, totalQty)

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "inventory",
        medusa_id: inventoryItemId,
        status: "success",
      })
    } catch (error: any) {
      this.logger.error(`[ERPNext] Inventory sync failed for ${inventoryItemId} (SKU: ${sku}): ${error.message}`)

      await this.createErpSyncLogs({
        direction: "to_erp",
        entity_type: "inventory",
        medusa_id: inventoryItemId,
        status: "failed",
        error: error.message,
      })
      throw error
    }
  }
}

export default ErpModuleService
