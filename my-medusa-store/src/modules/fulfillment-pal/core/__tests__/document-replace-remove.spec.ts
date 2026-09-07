describe("PAL Shipping Timeline Document Replace & Remove Rules", () => {
  let docStore: any[] = []
  let fileStorage: Map<string, string> = new Map()

  beforeEach(() => {
    docStore = []
    fileStorage = new Map()
  })

  // Simulated backend helper logic matching the actual PUT/DELETE route logic
  function uploadDocument(params: { shipmentId: string; stepId: string; documentType: string; fileName: string; fileSize: number; fileUrl: string; actorId?: string }) {
    const doc = {
      id: `doc_${Math.random().toString(36).substring(7)}`,
      shipment_id: params.shipmentId,
      timeline_step_id: params.stepId,
      type: params.documentType,
      file_name: params.fileName,
      file_size: params.fileSize,
      file_url: params.fileUrl,
      uploaded_by: params.actorId || "admin",
      uploaded_at: new Date(),
      status: "UPLOADED"
    }
    fileStorage.set(doc.id, params.fileUrl)
    docStore.push(doc)
    return doc
  }

  function replaceDocument(params: {
    shipmentId: string;
    stepId: string;
    documentId: string;
    stepStatus: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
    newFileName: string;
    newFileSize: number;
    newFileUrl: string;
    actorId?: string;
    authorizedVendor?: boolean;
    simulatedUploadError?: boolean;
  }) {
    if (params.authorizedVendor === false) {
      return { success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Vendor not authorized for this shipment" }
    }

    if (params.stepStatus === "COMPLETED") {
      return { success: false, code: "TIMELINE_STEP_COMPLETED", message: "Cannot replace document on a completed timeline step." }
    }

    const docIndex = docStore.findIndex(d => d.id === params.documentId)
    if (docIndex === -1) {
      return { success: false, code: "DOCUMENT_NOT_FOUND", message: "Document not found" }
    }

    const doc = docStore[docIndex]
    if (doc.timeline_step_id !== params.stepId) {
      return { success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Document does not belong to this step" }
    }

    if (params.simulatedUploadError) {
      return { success: false, code: "UPLOAD_FAILED", message: "Failed to process file upload." }
    }

    // Update existing record preserving ID and relationships
    doc.file_name = params.newFileName
    doc.file_size = params.newFileSize
    doc.file_url = params.newFileUrl
    doc.uploaded_by = params.actorId || doc.uploaded_by
    doc.uploaded_at = new Date()
    doc.status = "UPLOADED"

    fileStorage.set(doc.id, params.newFileUrl)
    return { success: true, document: doc }
  }

  function removeDocument(params: {
    shipmentId: string;
    stepId: string;
    documentId: string;
    stepStatus: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
    authorizedVendor?: boolean;
  }) {
    if (params.authorizedVendor === false) {
      return { success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Vendor not authorized for this shipment" }
    }

    if (params.stepStatus === "COMPLETED") {
      return { success: false, code: "TIMELINE_STEP_COMPLETED", message: "Cannot remove document from a completed timeline step." }
    }

    const docIndex = docStore.findIndex(d => d.id === params.documentId)
    if (docIndex === -1) {
      return { success: false, code: "DOCUMENT_NOT_FOUND", message: "Document not found" }
    }

    const doc = docStore[docIndex]
    if (doc.timeline_step_id !== params.stepId) {
      return { success: false, code: "DOCUMENT_UNAUTHORIZED", message: "Document does not belong to this step" }
    }

    docStore.splice(docIndex, 1)
    fileStorage.delete(params.documentId)
    return { success: true, message: "Document removed successfully" }
  }

  function evaluateStepCompletion(stepCode: string, stepConfig: any, requiredDocTypes: string[]) {
    for (const reqType of requiredDocTypes) {
      const hasUploadedDoc = docStore.some(d => d.type === reqType && d.status === "UPLOADED")
      const isSkipped = stepConfig.document_status === "NOT_AVAILABLE" && (stepConfig.document_type === reqType || !stepConfig.document_type)
      
      if (!hasUploadedDoc && !isSkipped) {
        return { canComplete: false, error: `Required document missing: ${reqType}` }
      }

      if (isSkipped && !stepConfig.not_available_reason) {
        return { canComplete: false, error: `Reason mandatory for skipped document: ${reqType}` }
      }
    }
    return { canComplete: true }
  }

  // 1. Upload document successfully
  it("uploads document successfully", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "export_decl.pdf",
      fileSize: 102400,
      fileUrl: "http://storage.com/export_decl.pdf",
      actorId: "vendor_1"
    })

    expect(doc).toBeDefined()
    expect(doc.status).toBe("UPLOADED")
    expect(docStore.length).toBe(1)
    expect(docStore[0].file_name).toBe("export_decl.pdf")
  })

  // 2. Replace an uploaded document successfully
  it("replaces an uploaded document successfully and updates existing record", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "export_old.pdf",
      fileSize: 102400,
      fileUrl: "http://storage.com/export_old.pdf"
    })

    const originalId = doc.id
    const result = replaceDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: originalId,
      stepStatus: "IN_PROGRESS",
      newFileName: "export_updated.pdf",
      newFileSize: 204800,
      newFileUrl: "http://storage.com/export_updated.pdf",
      actorId: "vendor_1"
    })

    expect(result.success).toBe(true)
    expect(result.document?.id).toBe(originalId)
    expect(result.document?.file_name).toBe("export_updated.pdf")
    expect(result.document?.file_size).toBe(204800)
    expect(docStore.length).toBe(1)
  })

  // 3. Failed replacement preserves the old document
  it("preserves old document if replacement upload fails", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "export_original.pdf",
      fileSize: 102400,
      fileUrl: "http://storage.com/export_original.pdf"
    })

    const result = replaceDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS",
      newFileName: "corrupted.pdf",
      newFileSize: 0,
      newFileUrl: "",
      simulatedUploadError: true
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("UPLOAD_FAILED")
    expect(docStore.length).toBe(1)
    expect(docStore[0].file_name).toBe("export_original.pdf")
    expect(docStore[0].file_url).toBe("http://storage.com/export_original.pdf")
  })

  // 4. Remove document successfully before completion
  it("removes document successfully before completion", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "temp_doc.pdf",
      fileSize: 50000,
      fileUrl: "http://storage.com/temp_doc.pdf"
    })

    const result = removeDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "AVAILABLE"
    })

    expect(result.success).toBe(true)
    expect(docStore.length).toBe(0)
    expect(fileStorage.has(doc.id)).toBe(false)
  })

  // 5. Cannot remove document after timeline step is completed
  it("rejects document removal if timeline step is COMPLETED", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "final_doc.pdf",
      fileSize: 50000,
      fileUrl: "http://storage.com/final_doc.pdf"
    })

    const result = removeDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "COMPLETED"
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("TIMELINE_STEP_COMPLETED")
    expect(docStore.length).toBe(1)
  })

  // 6. Cannot replace document after timeline step is completed
  it("rejects document replacement if timeline step is COMPLETED", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "final_doc.pdf",
      fileSize: 50000,
      fileUrl: "http://storage.com/final_doc.pdf"
    })

    const result = replaceDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "COMPLETED",
      newFileName: "attempted_replace.pdf",
      newFileSize: 60000,
      newFileUrl: "http://storage.com/attempted_replace.pdf"
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("TIMELINE_STEP_COMPLETED")
    expect(docStore[0].file_name).toBe("final_doc.pdf")
  })

  // 7. Required document removal blocks timeline completion
  it("blocks timeline completion when a required document is removed", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_customs",
      documentType: "CUSTOMS_PREPARATION",
      fileName: "customs.pdf",
      fileSize: 80000,
      fileUrl: "http://storage.com/customs.pdf"
    })

    // Initially valid with uploaded document
    let check = evaluateStepCompletion("CUSTOMS_PREPARATION", {}, ["CUSTOMS_PREPARATION"])
    expect(check.canComplete).toBe(true)

    // Remove document
    removeDocument({
      shipmentId: "ship_1",
      stepId: "step_customs",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS"
    })

    // Completion now blocked
    check = evaluateStepCompletion("CUSTOMS_PREPARATION", {}, ["CUSTOMS_PREPARATION"])
    expect(check.canComplete).toBe(false)
    expect(check.error).toContain("Required document missing")

    // Unblocked if explicitly marked NOT_AVAILABLE with reason
    check = evaluateStepCompletion("CUSTOMS_PREPARATION", { document_status: "NOT_AVAILABLE", not_available_reason: "Exempted by customs agent" }, ["CUSTOMS_PREPARATION"])
    expect(check.canComplete).toBe(true)
  })

  // 8. Vendor authorization prevents modifying another vendor's document
  it("prevents unauthorized vendor from replacing or removing document", () => {
    const doc = uploadDocument({
      shipmentId: "ship_vendorA",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "vendorA_doc.pdf",
      fileSize: 90000,
      fileUrl: "http://storage.com/vendorA_doc.pdf",
      actorId: "vendorA"
    })

    // Unauthorized replace
    const replaceRes = replaceDocument({
      shipmentId: "ship_vendorA",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS",
      newFileName: "hacked.pdf",
      newFileSize: 100,
      newFileUrl: "http://storage.com/hacked.pdf",
      authorizedVendor: false
    })

    expect(replaceRes.success).toBe(false)
    expect(replaceRes.code).toBe("DOCUMENT_UNAUTHORIZED")

    // Unauthorized remove
    const removeRes = removeDocument({
      shipmentId: "ship_vendorA",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS",
      authorizedVendor: false
    })

    expect(removeRes.success).toBe(false)
    expect(removeRes.code).toBe("DOCUMENT_UNAUTHORIZED")

    // Record remains untouched
    expect(docStore.length).toBe(1)
    expect(docStore[0].file_name).toBe("vendorA_doc.pdf")
  })

  // 9. No duplicate active document is created after replacement
  it("does not create duplicate document records when replacing multiple times", () => {
    const doc = uploadDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentType: "EXPORT_DOCUMENTATION",
      fileName: "v1.pdf",
      fileSize: 1000,
      fileUrl: "http://storage.com/v1.pdf"
    })

    replaceDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS",
      newFileName: "v2.pdf",
      newFileSize: 2000,
      newFileUrl: "http://storage.com/v2.pdf"
    })

    replaceDocument({
      shipmentId: "ship_1",
      stepId: "step_export",
      documentId: doc.id,
      stepStatus: "IN_PROGRESS",
      newFileName: "v3.pdf",
      newFileSize: 3000,
      newFileUrl: "http://storage.com/v3.pdf"
    })

    expect(docStore.length).toBe(1)
    expect(docStore[0].file_name).toBe("v3.pdf")
    expect(docStore[0].id).toBe(doc.id)
  })
})
