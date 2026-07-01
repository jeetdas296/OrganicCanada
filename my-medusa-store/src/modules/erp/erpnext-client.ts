import { Logger } from "@medusajs/framework/types"

export interface ERPNextConfig {
  enabled: boolean
  url: string
  apiKey: string
  apiSecret: string
  company: string
  warehouse: string
  priceList?: string
  syncOnOrderPlaced?: boolean
  syncOnProductUpdate?: boolean
  syncOnInventoryChange?: boolean
  retryAttempts?: number
  retryBackoffMs?: number
}

export class ERPNextClient {
  private config: ERPNextConfig
  private logger: Logger

  constructor(config: ERPNextConfig, logger: Logger) {
    this.config = config
    this.logger = logger
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    if (!this.config.enabled) {
      this.logger.info("[ERPNext] Integration is disabled. Skipping request.")
      return null
    }

    const url = `${this.config.url}${path}`
    const headers: Record<string, string> = {
      "Authorization": `token ${this.config.apiKey}:${this.config.apiSecret}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }

    let attempts = 0
    const maxAttempts = this.config.retryAttempts || 5
    const backoffMs = this.config.retryBackoffMs || 1000

    while (attempts < maxAttempts) {
      try {
        attempts++
        this.logger.debug(`[ERPNext] [Attempt ${attempts}/${maxAttempts}] Sending ${method} ${url}`)

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        })

        if (response.ok) {
          const data = await response.json()
          return data.data || data
        }

        const status = response.status
        const errorText = await response.text()

        // Log the failure
        this.logger.error(`[ERPNext] Request failed: ${method} ${url} - Status: ${status} - Error: ${errorText}`)

        // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
        if (status === 429 || (status >= 500 && status < 600)) {
          if (attempts < maxAttempts) {
            const delay = backoffMs * Math.pow(2, attempts - 1)
            this.logger.info(`[ERPNext] Retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
        }

        throw new Error(`ERPNext API error: Status ${status} - ${errorText}`)
      } catch (error: any) {
        if (attempts >= maxAttempts) {
          throw error
        }
        const delay = backoffMs * Math.pow(2, attempts - 1)
        this.logger.info(`[ERPNext] Network error, retrying in ${delay}ms... (Error: ${error.message})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  async ping(): Promise<boolean> {
    try {
      // In ERPNext, we check if the API is working by calling a simple method or list
      const res = await this.request("GET", "/api/method/frappe.auth.get_logged_user")
      return !!res
    } catch (e: any) {
      this.logger.error(`[ERPNext] Ping failed: ${e.message}`)
      return false
    }
  }

  async upsertCustomer(customerData: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    name_in_erp?: string
  }): Promise<string> {
    const fullName = `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim() || customerData.email

    // If we already have a mapped name, we can update it
    if (customerData.name_in_erp) {
      try {
        const updatePayload = {
          customer_name: fullName,
          mobile_no: customerData.phone || undefined,
        }
        const updated = await this.request("PUT", `/api/resource/Customer/${encodeURIComponent(customerData.name_in_erp)}`, updatePayload)
        return updated.name || customerData.name_in_erp
      } catch (e: any) {
        this.logger.warn(`[ERPNext] Failed to update customer ${customerData.name_in_erp}, will try searching by email instead. Error: ${e.message}`)
      }
    }

    // Search by email
    const searchUrl = `/api/resource/Customer?filters=[["Customer","email_id","=","${customerData.email}"]]`
    const existing = await this.request("GET", searchUrl)

    if (existing && existing.length > 0) {
      const erpName = existing[0].name
      // Update existing
      const updatePayload = {
        customer_name: fullName,
        mobile_no: customerData.phone || undefined,
      }
      const updated = await this.request("PUT", `/api/resource/Customer/${encodeURIComponent(erpName)}`, updatePayload)
      return updated.name || erpName
    }

    // Create new
    const createPayload = {
      customer_name: fullName,
      customer_type: "Individual",
      email_id: customerData.email,
      mobile_no: customerData.phone || undefined,
    }
    const created = await this.request("POST", "/api/resource/Customer", createPayload)
    return created.name
  }

  async upsertItem(itemData: {
    sku: string
    title: string
    description?: string
    price?: number // in cents
    is_stock_item: boolean
  }): Promise<string> {
    const itemCode = itemData.sku
    const itemName = itemData.title

    // Check if Item exists
    let itemExists = false
    try {
      await this.request("GET", `/api/resource/Item/${encodeURIComponent(itemCode)}`)
      itemExists = true
    } catch (e) {
      // Doesn't exist or other error
    }

    if (itemExists) {
      // Update existing Item
      const updatePayload = {
        item_name: itemName,
        description: itemData.description || undefined,
        is_stock_item: itemData.is_stock_item ? 1 : 0,
      }
      await this.request("PUT", `/api/resource/Item/${encodeURIComponent(itemCode)}`, updatePayload)
    } else {
      // Create new Item
      const createPayload = {
        item_code: itemCode,
        item_name: itemName,
        item_group: "All Item Groups",
        stock_uom: "Nos",
        is_stock_item: itemData.is_stock_item ? 1 : 0,
        description: itemData.description || undefined,
      }
      await this.request("POST", "/api/resource/Item", createPayload)
    }

    // Update Price if price is provided and price list is configured
    if (itemData.price !== undefined && this.config.priceList) {
      const rate = itemData.price

      // Search if Item Price already exists
      const priceSearchUrl = `/api/resource/Item Price?filters=[["Item Price","item_code","=","${itemCode}"],["Item Price","price_list","=","${this.config.priceList}"]]`
      const existingPrices = await this.request("GET", priceSearchUrl)

      if (existingPrices && existingPrices.length > 0) {
        const priceName = existingPrices[0].name
        await this.request("PUT", `/api/resource/Item Price/${encodeURIComponent(priceName)}`, {
          price_list_rate: rate
        })
      } else {
        await this.request("POST", "/api/resource/Item Price", {
          item_code: itemCode,
          price_list: this.config.priceList,
          price_list_rate: rate
        })
      }
    }

    return itemCode
  }

  async createSalesOrder(orderData: {
    customer_erp_name: string
    medusa_order_id: string
    items: Array<{
      sku: string
      qty: number
      price: number // in cents
    }>
  }): Promise<string> {
    const todayStr = new Date().toISOString().split('T')[0]

    const itemsPayload = orderData.items.map(item => ({
      item_code: item.sku,
      qty: item.qty,
      rate: item.price,
      warehouse: this.config.warehouse
    }))

    const createPayload = {
      customer: orderData.customer_erp_name,
      company: this.config.company,
      transaction_date: todayStr,
      delivery_date: todayStr,
      naming_series: "SO-",
      items: itemsPayload,
    }

    const created = await this.request("POST", "/api/resource/Sales Order", createPayload)

    // Auto-submit Sales Order (docstatus = 1 means Submitted in Frappe/ERPNext)
    try {
      await this.request("PUT", `/api/resource/Sales Order/${encodeURIComponent(created.name)}`, {
        docstatus: 1
      })
    } catch (e: any) {
      this.logger.error(`[ERPNext] Failed to submit Sales Order ${created.name}: ${e.message}`)
    }

    return created.name
  }

  async createSalesInvoice(orderData: {
    customer_erp_name: string
    sales_order_name?: string
    items: Array<{
      sku: string
      qty: number
      price: number // in cents
    }>
  }): Promise<string> {
    const todayStr = new Date().toISOString().split('T')[0]

    const itemsPayload = orderData.items.map(item => ({
      item_code: item.sku,
      qty: item.qty,
      rate: item.price,
      warehouse: this.config.warehouse,
      sales_order: orderData.sales_order_name
    }))

    const createPayload = {
      customer: orderData.customer_erp_name,
      company: this.config.company,
      posting_date: todayStr,
      update_stock: 1, // Deduct stock when invoice is submitted
      items: itemsPayload,
    }

    const created = await this.request("POST", "/api/resource/Sales Invoice", createPayload)

    // Submit Sales Invoice (docstatus = 1)
    await this.request("PUT", `/api/resource/Sales Invoice/${encodeURIComponent(created.name)}`, {
      docstatus: 1
    })

    return created.name
  }

  async updateStock(sku: string, absoluteQty: number): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0]

    // We use Stock Reconciliation to set the exact quantity
    const payload = {
      company: this.config.company,
      purpose: "Stock Reconciliation",
      posting_date: todayStr,
      docstatus: 1, // Submit immediately
      items: [
        {
          item_code: sku,
          warehouse: this.config.warehouse,
          qty: absoluteQty,
        }
      ]
    }

    await this.request("POST", "/api/resource/Stock Reconciliation", payload)
  }
}
