import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import fs from "fs"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../../../../modules/fulfillment-pal"

async function checkVendorAuthorization(query: any, actorId: string | undefined, shipment: any): Promise<{ authorized: boolean; activeVendorId: string | null }> {
  if (!actorId) return { authorized: true, activeVendorId: null }

  let activeVendorId: string | null = null
  try {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: actorId }
    })
    activeVendorId = users[0]?.vendor?.id || null
  } catch (e) { }

  if (!activeVendorId) return { authorized: true, activeVendorId: null }

  if (!shipment.order_id) return { authorized: true, activeVendorId }

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.variant.product.vendor.id"],
      filters: { id: shipment.order_id }
    })
    const orderItems = orders[0]?.items || []
    const vendorItems = orderItems.filter((i: any) => (i?.variant?.product?.vendor?.id || "platform_direct") === activeVendorId)
    if (vendorItems.length === 0) {
      return { authorized: false, activeVendorId }
    }
  } catch (e) { }

  return { authorized: true, activeVendorId }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { shipmentId, step, documentId } = req.params

  try {
    const query = req.scope.resolve("query")

    // Fetch shipment
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: ["id", "order_id", "timelines.*", "timelines.steps.*"],
      filters: { id: shipmentId },
    })

    const shipment = shipments[0]
    if (!shipment) {
      return res.status(404).json({ success: false, code: "SHIPMENT_NOT_FOUND", message: "Shipment not found" })
    }

    // Check Vendor Authorization
    const actorId = (req as any).auth_context?.actor_id
    const { authorized } = await checkVendorAuthorization(query, actorId, shipment)
    if (!authorized) {
      return res.status(403).json({ success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Vendor not authorized for this shipment" })
    }

    const timelineStep = shipment.timelines?.[0]?.steps?.find((s: any) => s.step_code === step)
    if (!timelineStep) {
      return res.status(404).json({ success: false, code: "TIMELINE_STEP_NOT_FOUND", message: "Timeline step not found" })
    }

    // Verify step status
    if (timelineStep.status === "COMPLETED") {
      return res.status(400).json({ success: false, code: "TIMELINE_STEP_COMPLETED", message: "Cannot replace document on a completed timeline step." })
    }

    // Fetch existing document
    const { data: documents } = await query.graph({
      entity: "pal_document",
      fields: ["id", "type", "status", "file_name", "file_url", "file_id", "timeline_step_id"],
      filters: { id: documentId } as any,
    })

    const existingDoc = documents[0]
    if (!existingDoc) {
      return res.status(404).json({ success: false, code: "DOCUMENT_NOT_FOUND", message: "Document not found" })
    }

    if (existingDoc.timeline_step_id && existingDoc.timeline_step_id !== timelineStep.id) {
      return res.status(400).json({ success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Document does not belong to this step" })
    }

    const file = (req as any).file
    if (!file) {
      return res.status(400).json({ success: false, code: "INVALID_FILE", message: "No file provided. Make sure field name is 'file'." })
    }

    const validMimes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!validMimes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, code: "INVALID_FILE", message: "Invalid file type. Only PDF, JPG, PNG allowed." })
    }

    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, code: "INVALID_FILE", message: "File too large. Max 10MB." })
    }

    // Upload new file first
    let newFileUrl = ""
    let fileService: any = null
    try {
      fileService = req.scope.resolve(Modules.FILE)
      const fileContent = file.buffer ? file.buffer.toString("base64") : fs.readFileSync(file.path).toString("base64")

      const uploadRes = await fileService.createFiles([{
        content: fileContent,
        filename: file.originalname,
        mimeType: file.mimetype,
      }])

      if (Array.isArray(uploadRes) && uploadRes.length > 0) {
        newFileUrl = uploadRes[0].url
      } else if (uploadRes && uploadRes.url) {
        newFileUrl = uploadRes.url
      }
    } catch (e: any) {
      console.warn("Could not use Medusa standard file service:", e.message)
      if (file.path && fs.existsSync(file.path)) {
        newFileUrl = `/${file.path.replace(/\\/g, "/")}`
      } else {
        return res.status(500).json({ success: false, code: "UPLOAD_FAILED", message: "Failed to process file upload." })
      }
    }

    // Cleanup temp Multer file if wrote to disk
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path) } catch (err) { }
    }

    // Try deleting old file if supported
    if (fileService && existingDoc.file_id) {
      try {
        await fileService.deleteFiles([existingDoc.file_id])
      } catch (err) {
        console.warn("Non-fatal: could not delete old file reference:", err)
      }
    }

    // Update existing PalDocument record (Preserving record ID)
    const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
    const updateData = {
      id: documentId,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_url: newFileUrl,
      uploaded_by: actorId || "unknown",
      uploaded_at: new Date(),
      status: "UPLOADED",
    }

    const [updatedDoc] = await (palService as any).updatePalDocuments([updateData])

    return res.json({
      success: true,
      document: updatedDoc
    })

  } catch (error: any) {
    console.error("Document replace error:", error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { shipmentId, step, documentId } = req.params

  try {
    const query = req.scope.resolve("query")

    // Fetch shipment
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: ["id", "order_id", "timelines.*", "timelines.steps.*"],
      filters: { id: shipmentId },
    })

    const shipment = shipments[0]
    if (!shipment) {
      return res.status(404).json({ success: false, code: "SHIPMENT_NOT_FOUND", message: "Shipment not found" })
    }

    // Check Vendor Authorization
    const actorId = (req as any).auth_context?.actor_id
    const { authorized } = await checkVendorAuthorization(query, actorId, shipment)
    if (!authorized) {
      return res.status(403).json({ success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Vendor not authorized for this shipment" })
    }

    const timelineStep = shipment.timelines?.[0]?.steps?.find((s: any) => s.step_code === step)
    if (!timelineStep) {
      return res.status(404).json({ success: false, code: "TIMELINE_STEP_NOT_FOUND", message: "Timeline step not found" })
    }

    // Verify step status: Reject removal if step is COMPLETED
    if (timelineStep.status === "COMPLETED") {
      return res.status(400).json({ success: false, code: "TIMELINE_STEP_COMPLETED", message: "Cannot remove document from a completed timeline step." })
    }

    // Fetch existing document
    const { data: documents } = await query.graph({
      entity: "pal_document",
      fields: ["id", "file_id", "timeline_step_id"],
      filters: { id: documentId } as any,
    })

    const existingDoc = documents[0]
    if (!existingDoc) {
      return res.status(404).json({ success: false, code: "DOCUMENT_NOT_FOUND", message: "Document not found" })
    }

    if (existingDoc.timeline_step_id && existingDoc.timeline_step_id !== timelineStep.id) {
      return res.status(400).json({ success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Document does not belong to this step" })
    }

    // Attempt physical file deletion
    try {
      const fileService = req.scope.resolve(Modules.FILE)
      if (existingDoc.file_id) {
        await fileService.deleteFiles([existingDoc.file_id])
      }
    } catch (e: any) {
      console.warn("Non-fatal: failed to delete physical file during document removal:", e.message)
    }

    // Delete database record
    const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
    await (palService as any).deletePalDocuments([documentId])

    return res.json({
      success: true,
      message: "Document removed successfully"
    })

  } catch (error: any) {
    console.error("Document removal error:", error)
    return res.status(500).json({ success: false, message: error.message })
  }
}
