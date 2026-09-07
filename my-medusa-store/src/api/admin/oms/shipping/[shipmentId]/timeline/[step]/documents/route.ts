import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import fs from "fs"
import { getRequiredDocuments, DocumentRequirementParams } from "../../../../../../../../modules/fulfillment-pal/core/document-requirements"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../../../modules/fulfillment-pal"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { shipmentId, step } = req.params

  try {
    const query = req.scope.resolve("query")
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: ["id", "order_type", "transport_mode", "incoterm", "trade_classifier", "timelines.*", "timelines.steps.*"],
      filters: { id: shipmentId },
    })

    const shipment = shipments[0]
    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment not found" })
    }

    const timelineStep = shipment.timelines?.[0]?.steps?.find((s: any) => s.step_code === step)
    if (!timelineStep) {
      return res.status(404).json({ success: false, message: "Timeline step not found" })
    }

    // Determine requirements
    const params: DocumentRequirementParams = {
      orderType: shipment.order_type as "B2C" | "B2B",
      tradeType: (shipment as any).trade_classifier === "DOMESTIC" ? "DOMESTIC" : "CROSS_BORDER",
      transportMode: shipment.transport_mode as string | undefined,
      incoterm: shipment.incoterm as string | undefined
    }

    const requirements = getRequiredDocuments(params)

    // Fetch uploaded docs for this step
    const { data: documents } = await query.graph({
      entity: "pal_document",
      fields: ["id", "type", "status", "file_name", "file_url", "file_size", "uploaded_at", "uploaded_by"],
      filters: { timeline_step_id: timelineStep.id } as any,
    })

    return res.json({
      success: true,
      requirements,
      documents: documents || []
    })

  } catch (error: any) {
    console.error("Fetch document error:", error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { shipmentId, step } = req.params

  try {
    const query = req.scope.resolve("query")
    const { data: shipments } = await query.graph({
      entity: "pal_shipment",
      fields: ["id", "timelines.*", "timelines.steps.*"],
      filters: { id: shipmentId },
    })

    const shipment = shipments[0]
    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment not found" })
    }

    const timelineStep = shipment.timelines?.[0]?.steps?.find((s: any) => s.step_code === step)
    if (!timelineStep) {
      return res.status(404).json({ success: false, message: "Timeline step not found" })
    }

    if (timelineStep.status === "LOCKED") {
      return res.status(400).json({ success: false, message: "Cannot upload documents for a locked step." })
    }

    // Because of multer middleware in middlewares.ts, req.file should be populated
    const file = (req as any).file
    const documentType = (req.body as any).document_type || "UNKNOWN"

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded. Make sure field name is 'file'." })
    }

    const validMimes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!validMimes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only PDF, JPG, PNG allowed." })
    }

    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "File too large. Max 10MB." })
    }

    // Try uploading to Medusa's standard file service if resolved
    let fileUrl = ""
    try {
      const fileService = req.scope.resolve(Modules.FILE)
      
      const fileContent = file.buffer ? file.buffer.toString("base64") : fs.readFileSync(file.path).toString("base64")
      
      const uploadRes = await (fileService as any).createFiles([{
        content: fileContent,
        filename: file.originalname,
        mimeType: file.mimetype,
      }])
      
      if (Array.isArray(uploadRes) && uploadRes.length > 0) {
        fileUrl = uploadRes[0].url
      } else if (uploadRes && uploadRes.url) {
        fileUrl = uploadRes.url
      }
    } catch (e: any) {
      console.warn("Could not use Medusa standard file service:", e.message)
      if (file.path && fs.existsSync(file.path)) {
        fileUrl = `/${file.path.replace(/\\/g, "/")}`
      } else {
        return res.status(500).json({ success: false, message: "Failed to process file upload." })
      }
    }

    // Cleanup temp
    if (fileUrl && fileUrl !== `/${file.path?.replace(/\\/g, "/")}` && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path)
      } catch (err) { }
    }

    const palService = req.scope.resolve(FULFILLMENT_PAL_MODULE)
    
    const docData = {
      shipment: shipmentId,
      timeline_step_id: timelineStep.id,
      type: documentType,
      status: "UPLOADED",
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_url: fileUrl,
      uploaded_by: (req as any).auth_context?.actor_id || "unknown",
      uploaded_at: new Date()
    }
    
    const [createdDoc] = await (palService as any).createPalDocuments([docData])

    return res.json({
      success: true,
      document: createdDoc
    })

  } catch (error: any) {
    console.error("Document upload error:", error)
    return res.status(500).json({ success: false, message: error.message })
  }
}
