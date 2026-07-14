import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

// 1. Ask the Database if this order contains any Digital Files
const getDigitalAssetsStep = createStep("get-digital-assets", async (orderId: string, { container }) => {
  const query = container.resolve("query")

  // Get the order and all its items, deeply fetching the pluralized digital_assets!
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "items.*",
      "items.variant.*",
      "items.variant.digital_assets.*" // 🟢 Correctly pluralized
    ],
    filters: { id: orderId }
  })

  const order = orders[0]
  if (!order) return new StepResponse(null)

  const digitalAssetsToSend: Array<{
    itemTitle: string
    assets: any[]
  }> = []

  // Check every item in the cart
  for (const item of order.items ?? []) {
    if (!item) continue
    if (!item.variant_id) continue;

    // 🟢 THE FIX: You don't need a second query! 
    // The first query already grabbed the files. We just read the plural array directly.
    const assets = item.variant?.digital_assets || []

    // If we found linked digital assets, prepare them for delivery!
    if (assets.length > 0) {
      digitalAssetsToSend.push({
        itemTitle: item.title,
        assets: assets
      })
    }
  }

  return new StepResponse({ email: order.email, digitalAssets: digitalAssetsToSend })
})

// 2. The "Email" Engine (Currently logs to terminal, later connects to SendGrid/Resend)
const sendDigitalAssetEmailStep = createStep("send-digital-asset-email", async (data: any) => {
  // Ensure we safely handle empty data
  if (!data || !data.digitalAssets || data.digitalAssets.length === 0) {
    return new StepResponse(null) // Not a digital order, skip!
  }

  console.log(`\n📧 [DELIVERY ENGINE] Sending Digital Goods to: [REDACTED]`)
  console.log(`=======================================================`)

  data.digitalAssets.forEach((product: any) => {
    console.log(`📦 Product: ${product.itemTitle}`)
    product.assets.forEach((asset: any) => {
      console.log(`🔗 Download Link: ${asset.file_url}`)
    })
  })

  console.log(`=======================================================`)
  console.log(`✅ [DELIVERY ENGINE] Digital delivery complete!\n`)

  return new StepResponse(true)
})

// 3. Combine the steps into a Workflow
export const sendDigitalAssetsWorkflow = createWorkflow("send-digital-assets", (orderId: string) => {
  const data = getDigitalAssetsStep(orderId)
  sendDigitalAssetEmailStep(data)
  return new WorkflowResponse(data)
})