import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

// Step 1: Identify if the order contains bundles, what components they have, and the location to deduct from
const identifyBundleItemsStep = createStep("identify-bundle-items", async (orderId: string, { container }) => {
  const query = container.resolve("query")
  
  // Fetch order with items and product
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "sales_channel_id",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
    ],
    filters: { id: orderId }
  })
  
  const order = orders[0]
  if (!order) return new StepResponse({ deductions: [], locationId: null })

  // Find the location_id from the sales channel
  // The user specified: "My store uses specific stock locations mapped to sales channels/shipping zones."
  let locationId = null
  if (order.sales_channel_id) {
    try {
      const { data: salesChannels } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "stock_locations.*"],
        filters: { id: order.sales_channel_id }
      })
      const sc = salesChannels[0]
      if (sc?.stock_locations?.length > 0) {
        locationId = sc.stock_locations[0].id
        console.log(`[BUNDLE WORKFLOW] Found location ${locationId} for sales channel ${order.sales_channel_id}`)
      }
    } catch (e) {
      console.warn("Could not fetch stock locations for sales channel.", e)
    }
  }

  // If we couldn't find a location from the sales channel, we can't accurately deduct inventory here.
  // We'll proceed, but the next step will safely exit if locationId is missing.

  const deductions = []

  for (const item of order.items) {
    if (!item.variant?.product?.id) continue
    
    const productId = item.variant.product.id
    
    // Check if this product is a bundle
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "bundle.*", "bundle.items.*"],
      filters: { id: productId }
    })
    
    const product = products[0]
    if (product?.bundle?.items?.length) {
      console.log(`[BUNDLE WORKFLOW] Found Bundle in Order: ${product.bundle.title}`)
      for (const bundleItem of product.bundle.items) {
        deductions.push({
          product_id: bundleItem.product_id,
          // Total to deduct = (Quantity of bundles purchased) * (Quantity of this component per bundle)
          deduct_quantity: item.quantity * bundleItem.quantity
        })
      }
    }
  }
  
  return new StepResponse({ deductions, locationId })
})

// Step 2: Actually deduct the inventory
const deductComponentInventoryStep = createStep("deduct-component-inventory", async (data: { deductions: Array<{product_id: string, deduct_quantity: number}>, locationId: string | null }, { container }) => {
  const { deductions, locationId } = data
  if (deductions.length === 0) return new StepResponse(true)
  
  if (!locationId) {
    console.error("[BUNDLE WORKFLOW] Cannot deduct inventory: No locationId found for this order's sales channel.")
    return new StepResponse(false)
  }
    
  const query = container.resolve("query")
  const inventoryService = container.resolve(Modules.INVENTORY)
  
  for (const deduction of deductions) {
    // Get the inventory_item_id for this product component
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "variants.*", "variants.inventory_items.*"],
      filters: { id: deduction.product_id }
    })
    
    const product = products[0]
    if (!product) continue
      
    // Find the first valid inventory item linked to any of this product's variants
    let inventoryItemId = null
    for (const variant of product.variants || []) {
      for (const ii of variant.inventory_items || []) {
        if (ii.inventory_item_id) {
          inventoryItemId = ii.inventory_item_id
          break
        } else if (ii.id && !ii.variant_id) { 
          // Sometimes it might just map the id if graph API handles it differently
          inventoryItemId = ii.id
        }
      }
      if (inventoryItemId) break
    }
    
    if (inventoryItemId) {
      try {
        // adjustInventory(inventoryItemId, locationId, adjustmentAmount)
        // Negative amount deducts inventory
        await inventoryService.adjustInventory(inventoryItemId, locationId, -deduction.deduct_quantity)
        console.log(`✅ [BUNDLE WORKFLOW] Deducted ${deduction.deduct_quantity} from inventory_item ${inventoryItemId} at location ${locationId}`)
      } catch (err: any) {
        console.error(`❌ [BUNDLE WORKFLOW] Failed to deduct inventory for item ${inventoryItemId}:`, err.message)
      }
    } else {
      console.warn(`⚠️ [BUNDLE WORKFLOW] No inventory item linked for component product ${deduction.product_id}`)
    }
  }
  
  return new StepResponse(true)
})

export const deductBundleInventoryWorkflow = createWorkflow("deduct-bundle-inventory", (orderId: string) => {
  const data = identifyBundleItemsStep(orderId)
  deductComponentInventoryStep(data)
  return new WorkflowResponse(data)
})
