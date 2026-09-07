import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"

const ShipmentDetailPage = () => {
  const { shipmentId } = useParams()
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [configuringStep, setConfiguringStep] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<any>(null)
  const [stepConfig, setStepConfig] = useState<any>({})

  const loadShipment = async () => {
    try {
      setError(null)
      const res = await fetch(`/admin/oms/shipping/${shipmentId}`)
      
      if (!res.ok) {
        if (res.status === 404) setError("Shipment not found")
        else if (res.status === 403) setError("You are not authorized to view this shipment")
        else setError("Unable to load shipment")
        return
      }
      
      const data = await res.json()
      setShipment(data.shipment)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShipment()
  }, [shipmentId])

  const [docReqs, setDocReqs] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])

  const handleConfigureStep = async (step: any) => {
    setConfiguringStep(step)
    setStepError(null)
    setStepConfig(step.configuration || {})
    setDocReqs([])
    setDocs([])

    try {
      const res = await fetch(`/admin/oms/shipping/${shipmentId}/timeline/${step.step_code}/documents`)
      if (res.ok) {
        const data = await res.json()
        console.log(`DOCUMENT REQUIREMENTS\nstep: ${step.step_code}\nrequirements:`, JSON.stringify(data.requirements, null, 2))
        setDocReqs(data.requirements || [])
        setDocs(data.documents || [])
      } else {
        console.error("Failed to fetch documents:", await res.text())
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
    }
  }

  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadDocument = async (file: File, documentType: string) => {
    if (!configuringStep) return
    setUploadingType(documentType)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", documentType)

    try {
      const res = await fetch(`/admin/oms/shipping/${shipmentId}/timeline/${configuringStep.step_code}/documents`, {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.document) {
        setDocs(prev => [...prev.filter((d: any) => d.type !== documentType), data.document])
        const newConf = { ...stepConfig }
        delete newConf.document_status
        delete newConf.not_available_reason
        setStepConfig(newConf)
      } else {
        alert(data.message || "Failed to upload document")
      }
    } catch (e: any) {
      alert("Error uploading document: " + e.message)
    } finally {
      setUploadingType(null)
    }
  }

  const replaceDocument = async (file: File, documentId: string, documentType: string) => {
    if (!configuringStep) return
    setUploadingType(documentType)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/admin/oms/shipping/${shipmentId}/timeline/${configuringStep.step_code}/documents/${documentId}`, {
        method: "PUT",
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.document) {
        setDocs(prev => prev.map((d: any) => d.id === documentId ? data.document : d))
        const newConf = { ...stepConfig }
        delete newConf.document_status
        delete newConf.not_available_reason
        setStepConfig(newConf)
      } else {
        alert(data.message || "Failed to replace document")
      }
    } catch (e: any) {
      alert("Error replacing document: " + e.message)
    } finally {
      setUploadingType(null)
    }
  }

  const removeDocument = async (documentId: string, documentType: string) => {
    if (!configuringStep) return
    if (!window.confirm("Are you sure you want to remove this document?")) return

    setUploadingType(documentType)
    try {
      const res = await fetch(`/admin/oms/shipping/${shipmentId}/timeline/${configuringStep.step_code}/documents/${documentId}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (res.ok) {
        setDocs(prev => prev.filter((d: any) => d.id !== documentId))
      } else {
        alert(data.message || "Failed to remove document")
      }
    } catch (e: any) {
      alert("Error removing document: " + e.message)
    } finally {
      setUploadingType(null)
    }
  }

  const DocumentUploadField = ({ type }: { type: string }) => {
    const req = docReqs.find((r: any) => r.document_type === type)
    const isStandard = ["EXPORT_DOCUMENTATION", "CUSTOMS_PREPARATION", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN"].includes(type)
    if (!req && !isStandard) return null

    const uploadedDoc = docs.find((d: any) => d.type === type)
    const isRequired = req ? req.required : false
    const isStepCompleted = configuringStep?.status === "COMPLETED"
    const isUploading = uploadingType === type

    const genericSkip = stepConfig.document_status === "NOT_AVAILABLE"

    return (
      <div className="border p-4 rounded-md my-4 flex flex-col gap-2 bg-ui-bg-subtle">
        <div className="flex justify-between items-center">
          <Text className="font-semibold">{type.replace(/_/g, " ")}</Text>
          <Badge color={isRequired ? "red" : "blue"}>{isRequired ? "Required" : "Optional"}</Badge>
        </div>
        
        {uploadedDoc ? (
          <div className="flex flex-col gap-2 border p-3 rounded bg-ui-bg-base">
            <div className="flex justify-between items-start">
              <div>
                <Text className="text-sm font-medium text-ui-fg-base">✓ {uploadedDoc.file_name}</Text>
                <div className="flex gap-3 text-xs text-ui-fg-subtle mt-1">
                  {uploadedDoc.file_size && <span>Size: {formatFileSize(uploadedDoc.file_size)}</span>}
                  {uploadedDoc.uploaded_at && <span>Uploaded: {new Date(uploadedDoc.uploaded_at).toLocaleDateString()}</span>}
                  <span className="capitalize">Status: {uploadedDoc.status || "UPLOADED"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {uploadedDoc.file_url && (
                  <a href={uploadedDoc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs font-medium px-2 py-1 border rounded bg-white">
                    View
                  </a>
                )}

                {!isStepCompleted && (
                  <>
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[type] = el)}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          replaceDocument(e.target.files[0], uploadedDoc.id, type)
                        }
                      }}
                    />
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[type]?.click()}
                    >
                      {isUploading ? "Replacing..." : "Replace"}
                    </Button>

                    <Button
                      size="small"
                      variant="danger"
                      disabled={isUploading}
                      onClick={() => removeDocument(uploadedDoc.id, type)}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : genericSkip ? (
          <div className="flex flex-col gap-2">
            <Text className="text-sm text-ui-fg-error">⚠ Document Not Available</Text>
            <Input 
              placeholder="Reason mandatory for skipped documents" 
              value={stepConfig.not_available_reason || ""} 
              onChange={(e) => updateConfig("not_available_reason", e.target.value)} 
              disabled={isStepCompleted}
            />
            {!isStepCompleted && (
              <Button size="small" variant="secondary" onClick={() => {
                const newConf = { ...stepConfig }
                delete newConf.document_status
                delete newConf.not_available_reason
                setStepConfig(newConf)
              }}>Undo Skip</Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <input
              type="file"
              disabled={isStepCompleted || isUploading}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  uploadDocument(e.target.files[0], type)
                }
              }}
              className="text-sm"
            />
            {isUploading && <Text className="text-xs text-blue-600">Uploading file...</Text>}
            
            {!isStepCompleted && (
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id={`skip-${type}`} 
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateConfig("document_status", "NOT_AVAILABLE")
                      updateConfig("document_type", type)
                    } else {
                      const newConf = { ...stepConfig }
                      delete newConf.document_status
                      delete newConf.document_type
                      delete newConf.not_available_reason
                      setStepConfig(newConf)
                    }
                  }}
                />
                <label htmlFor={`skip-${type}`} className="text-sm">Document Not Available / Skip</label>
              </div>
            )}
            
            {stepConfig.document_status === "NOT_AVAILABLE" && (
              <Input 
                placeholder="Reason (Required)" 
                value={stepConfig.not_available_reason || ""} 
                onChange={(e) => updateConfig("not_available_reason", e.target.value)} 
                disabled={isStepCompleted}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  const handleSaveStep = async () => {
    if (!configuringStep) return

    try {
      const res = await fetch(`/admin/oms/shipping/${shipmentId}/timeline/${configuringStep.step_code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepConfig)
      })
      
      const data = await res.json()
      if (!res.ok) {
        setStepError(data)
        return
      }
      
      setConfiguringStep(null)
      await loadShipment()
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const updateConfig = (key: string, value: string) => {
    setStepConfig((prev: any) => ({ ...prev, [key]: value }))
  }

  const renderConfigForm = () => {
    const code = configuringStep.step_code

    // Common fields
    const NotesField = () => <Input placeholder="Notes (Optional)" value={stepConfig.notes || ""} onChange={(e) => updateConfig("notes", e.target.value)} />

    if (code === "ORDER_CONFIRMED") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="date" placeholder="Confirmation Date" value={stepConfig.confirmation_date || ""} onChange={(e) => updateConfig("confirmation_date", e.target.value)} />
          <Input placeholder="Order Reference" value={stepConfig.order_reference || ""} onChange={(e) => updateConfig("order_reference", e.target.value)} />
          <Input placeholder="Confirmed By" value={stepConfig.confirmed_by || ""} onChange={(e) => updateConfig("confirmed_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "PICKING") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Warehouse/Location" value={stepConfig.warehouse || ""} onChange={(e) => updateConfig("warehouse", e.target.value)} />
          <Input placeholder="Picker" value={stepConfig.picker || ""} onChange={(e) => updateConfig("picker", e.target.value)} />
          <Input type="number" placeholder="Quantity Picked" value={stepConfig.quantity_picked || ""} onChange={(e) => updateConfig("quantity_picked", e.target.value)} />
          <Input type="date" placeholder="Picking Date" value={stepConfig.picking_date || ""} onChange={(e) => updateConfig("picking_date", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "PACKING") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="number" placeholder="Package Count" value={stepConfig.package_count || ""} onChange={(e) => updateConfig("package_count", e.target.value)} />
          <Input placeholder="Package Type" value={stepConfig.package_type || ""} onChange={(e) => updateConfig("package_type", e.target.value)} />
          <Input placeholder="Dimensions" value={stepConfig.dimensions || ""} onChange={(e) => updateConfig("dimensions", e.target.value)} />
          <Input type="number" placeholder="Weight" value={stepConfig.weight || ""} onChange={(e) => updateConfig("weight", e.target.value)} />
          <Input placeholder="Weight Unit" value={stepConfig.weight_unit || ""} onChange={(e) => updateConfig("weight_unit", e.target.value)} />
          <Input placeholder="Packed By" value={stepConfig.packed_by || ""} onChange={(e) => updateConfig("packed_by", e.target.value)} />
          <Input type="date" placeholder="Packing Date" value={stepConfig.packing_date || ""} onChange={(e) => updateConfig("packing_date", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "EXPORT_DOCUMENTATION") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Document Type" value={stepConfig.document_type || ""} onChange={(e) => updateConfig("document_type", e.target.value)} />
          <Input placeholder="Document Number" value={stepConfig.document_number || ""} onChange={(e) => updateConfig("document_number", e.target.value)} />
          <Input type="date" placeholder="Document Date" value={stepConfig.document_date || ""} onChange={(e) => updateConfig("document_date", e.target.value)} />
          <Input type="date" placeholder="Expiry Date" value={stepConfig.expiry_date || ""} onChange={(e) => updateConfig("expiry_date", e.target.value)} />
          <Input placeholder="Document Reference" value={stepConfig.document_reference || ""} onChange={(e) => updateConfig("document_reference", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "CUSTOMS_PREPARATION") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Text className="font-medium text-sm text-ui-fg-subtle">Customs Information</Text>
          <Input placeholder="HS Code" value={stepConfig.hs_code || ""} onChange={(e) => updateConfig("hs_code", e.target.value)} />
          <Input placeholder="Country of Origin" value={stepConfig.country_of_origin || ""} onChange={(e) => updateConfig("country_of_origin", e.target.value)} />
          <Input type="number" placeholder="Declared Value" value={stepConfig.declared_value || ""} onChange={(e) => updateConfig("declared_value", e.target.value)} />
          <Input placeholder="Currency" value={stepConfig.currency || ""} onChange={(e) => updateConfig("currency", e.target.value)} />
          <Input placeholder="Incoterm" value={stepConfig.incoterm || ""} onChange={(e) => updateConfig("incoterm", e.target.value)} />
          <Input placeholder="Customs Reference" value={stepConfig.customs_reference || ""} onChange={(e) => updateConfig("customs_reference", e.target.value)} />
          
          <Text className="font-medium text-sm text-ui-fg-subtle mt-2">Preparation</Text>
          <Input type="date" placeholder="Preparation Date" value={stepConfig.preparation_date || ""} onChange={(e) => updateConfig("preparation_date", e.target.value)} />
          <Input placeholder="Prepared By" value={stepConfig.prepared_by || ""} onChange={(e) => updateConfig("prepared_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "COMMERCIAL_INVOICE") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Invoice Number" value={stepConfig.invoice_number || ""} onChange={(e) => updateConfig("invoice_number", e.target.value)} />
          <Input type="date" placeholder="Invoice Date" value={stepConfig.invoice_date || ""} onChange={(e) => updateConfig("invoice_date", e.target.value)} />
          <Input placeholder="Seller Name" value={stepConfig.seller || ""} onChange={(e) => updateConfig("seller", e.target.value)} />
          <Input placeholder="Buyer Name" value={stepConfig.buyer || ""} onChange={(e) => updateConfig("buyer", e.target.value)} />
          <Input placeholder="Currency" value={stepConfig.currency || ""} onChange={(e) => updateConfig("currency", e.target.value)} />
          <Input type="number" placeholder="Subtotal" value={stepConfig.subtotal || ""} onChange={(e) => updateConfig("subtotal", e.target.value)} />
          <Input type="number" placeholder="Tax" value={stepConfig.tax || ""} onChange={(e) => updateConfig("tax", e.target.value)} />
          <Input type="number" placeholder="Total Value" value={stepConfig.total_value || ""} onChange={(e) => updateConfig("total_value", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "PACKING_LIST") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="number" placeholder="Package Count" value={stepConfig.package_count || ""} onChange={(e) => updateConfig("package_count", e.target.value)} />
          <Input placeholder="Dimensions" value={stepConfig.dimensions || ""} onChange={(e) => updateConfig("dimensions", e.target.value)} />
          <Input type="number" placeholder="Weight" value={stepConfig.weight || ""} onChange={(e) => updateConfig("weight", e.target.value)} />
          <Input placeholder="Weight Unit" value={stepConfig.weight_unit || ""} onChange={(e) => updateConfig("weight_unit", e.target.value)} />
          <Input placeholder="Contents" value={stepConfig.contents || ""} onChange={(e) => updateConfig("contents", e.target.value)} />
          <Input placeholder="Package Reference" value={stepConfig.package_reference || ""} onChange={(e) => updateConfig("package_reference", e.target.value)} />
          <Input type="date" placeholder="Packing Date" value={stepConfig.packing_date || ""} onChange={(e) => updateConfig("packing_date", e.target.value)} />
          <Input placeholder="Prepared By" value={stepConfig.prepared_by || ""} onChange={(e) => updateConfig("prepared_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "CERTIFICATE_OF_ORIGIN") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Origin Country" value={stepConfig.origin_country || ""} onChange={(e) => updateConfig("origin_country", e.target.value)} />
          <Input placeholder="Certificate Number" value={stepConfig.certificate_number || ""} onChange={(e) => updateConfig("certificate_number", e.target.value)} />
          <Input type="date" placeholder="Issue Date" value={stepConfig.issue_date || ""} onChange={(e) => updateConfig("issue_date", e.target.value)} />
          <Input placeholder="Issuing Authority" value={stepConfig.issuing_authority || ""} onChange={(e) => updateConfig("issuing_authority", e.target.value)} />
          <Input placeholder="Document Reference" value={stepConfig.document_reference || ""} onChange={(e) => updateConfig("document_reference", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "FREIGHT_PLANNING") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Transport Mode" value={stepConfig.transport_mode || ""} onChange={(e) => updateConfig("transport_mode", e.target.value)} />
          <Input type="date" placeholder="Pickup Date" value={stepConfig.pickup_date || ""} onChange={(e) => updateConfig("pickup_date", e.target.value)} />
          <Input type="date" placeholder="Delivery Target" value={stepConfig.delivery_target || ""} onChange={(e) => updateConfig("delivery_target", e.target.value)} />
          <Input placeholder="Forwarder Reference" value={stepConfig.forwarder_reference || ""} onChange={(e) => updateConfig("forwarder_reference", e.target.value)} />
          <Input placeholder="Instructions" value={stepConfig.instructions || ""} onChange={(e) => updateConfig("instructions", e.target.value)} />
          <Input placeholder="Planned By" value={stepConfig.planned_by || ""} onChange={(e) => updateConfig("planned_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "PICKUP_SCHEDULED") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="date" placeholder="Pickup Date" value={stepConfig.pickup_date || ""} onChange={(e) => updateConfig("pickup_date", e.target.value)} />
          <Input placeholder="Pickup Window Start (e.g. 09:00)" value={stepConfig.pickup_window_start || ""} onChange={(e) => updateConfig("pickup_window_start", e.target.value)} />
          <Input placeholder="Pickup Window End (e.g. 12:00)" value={stepConfig.pickup_window_end || ""} onChange={(e) => updateConfig("pickup_window_end", e.target.value)} />
          <Input placeholder="Pickup Location" value={stepConfig.pickup_location || ""} onChange={(e) => updateConfig("pickup_location", e.target.value)} />
          <Input placeholder="Contact Person" value={stepConfig.contact_person || ""} onChange={(e) => updateConfig("contact_person", e.target.value)} />
          <Input placeholder="Instructions" value={stepConfig.instructions || ""} onChange={(e) => updateConfig("instructions", e.target.value)} />
          <Input placeholder="Scheduled By" value={stepConfig.scheduled_by || ""} onChange={(e) => updateConfig("scheduled_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "SHIPMENT_BOOKED") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input placeholder="Booking Reference" value={stepConfig.booking_reference || ""} onChange={(e) => updateConfig("booking_reference", e.target.value)} />
          <Input type="date" placeholder="Booking Date" value={stepConfig.booking_date || ""} onChange={(e) => updateConfig("booking_date", e.target.value)} />
          <Input placeholder="Service" value={stepConfig.service || ""} onChange={(e) => updateConfig("service", e.target.value)} />
          <Input placeholder="Confirmation Reference" value={stepConfig.confirmation_reference || ""} onChange={(e) => updateConfig("confirmation_reference", e.target.value)} />
          <Input placeholder="Booked By" value={stepConfig.booked_by || ""} onChange={(e) => updateConfig("booked_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "IN_TRANSIT") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="date" placeholder="Departure Date" value={stepConfig.departure_date || ""} onChange={(e) => updateConfig("departure_date", e.target.value)} />
          <Input placeholder="Origin" value={stepConfig.origin || ""} onChange={(e) => updateConfig("origin", e.target.value)} />
          <Input placeholder="Destination" value={stepConfig.destination || ""} onChange={(e) => updateConfig("destination", e.target.value)} />
          <Input placeholder="Tracking Reference" value={stepConfig.tracking_reference || ""} onChange={(e) => updateConfig("tracking_reference", e.target.value)} />
          <Input type="date" placeholder="Estimated Arrival" value={stepConfig.estimated_arrival || ""} onChange={(e) => updateConfig("estimated_arrival", e.target.value)} />
          <Input placeholder="Carrier Reference" value={stepConfig.carrier_reference || ""} onChange={(e) => updateConfig("carrier_reference", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "CUSTOMS_CLEARED") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="date" placeholder="Clearance Date" value={stepConfig.clearance_date || ""} onChange={(e) => updateConfig("clearance_date", e.target.value)} />
          <Input placeholder="Customs Reference" value={stepConfig.customs_reference || ""} onChange={(e) => updateConfig("customs_reference", e.target.value)} />
          <Input placeholder="Clearance Status" value={stepConfig.clearance_status || ""} onChange={(e) => updateConfig("clearance_status", e.target.value)} />
          <Input type="number" placeholder="Duty Amount" value={stepConfig.duty_amount || ""} onChange={(e) => updateConfig("duty_amount", e.target.value)} />
          <Input type="number" placeholder="Tax Amount" value={stepConfig.tax_amount || ""} onChange={(e) => updateConfig("tax_amount", e.target.value)} />
          <Input placeholder="Currency" value={stepConfig.currency || ""} onChange={(e) => updateConfig("currency", e.target.value)} />
          <Input placeholder="Cleared By" value={stepConfig.cleared_by || ""} onChange={(e) => updateConfig("cleared_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }
    if (code === "DELIVERED") {
      return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
          <Input type="date" placeholder="Delivery Date" value={stepConfig.delivery_date || ""} onChange={(e) => updateConfig("delivery_date", e.target.value)} />
          <Input placeholder="Delivery Time" value={stepConfig.delivery_time || ""} onChange={(e) => updateConfig("delivery_time", e.target.value)} />
          <Input placeholder="Recipient" value={stepConfig.recipient || ""} onChange={(e) => updateConfig("recipient", e.target.value)} />
          <Input placeholder="Proof of Delivery Reference" value={stepConfig.proof_of_delivery_reference || ""} onChange={(e) => updateConfig("proof_of_delivery_reference", e.target.value)} />
          <Input placeholder="Delivered By" value={stepConfig.delivered_by || ""} onChange={(e) => updateConfig("delivered_by", e.target.value)} />
          <NotesField />
        </div>
      )
    }

    // Fallback
    return (
        <div className="flex flex-col gap-y-3">
          <DocumentUploadField type={code} />
        <Text className="text-sm text-ui-fg-subtle">Confirm this step has been completed.</Text>
        <NotesField />
      </div>
    )
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 font-medium text-ui-fg-base">{error}</div>
  if (!shipment) return <div className="p-8 font-medium text-ui-fg-base">Shipment not found or unauthorized</div>

  return (
    <div className="flex flex-col gap-y-4">
      <Link to="/shipping" className="text-ui-fg-interactive text-sm">
        ← Back to Shipping
      </Link>

      <Container className="p-6 border bg-ui-bg-base rounded-lg flex flex-col gap-y-4">
        <Heading level="h1">Order #{shipment.order_id}</Heading>
        <div className="flex items-center gap-x-2">
          <Badge>{shipment.order_type}</Badge>
          <Badge color="blue">{shipment.trade_type}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
          <div>
            <Text className="text-ui-fg-subtle text-sm">Products</Text>
            {shipment.products.map((p: any, i: number) => (
              <Text key={i} className="text-sm font-medium">{p.quantity}x {p.title} (${p.price}) - {p.vendor}</Text>
            ))}
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-sm">Logistics</Text>
            <Text className="text-sm font-medium">Provider: {shipment.provider}</Text>
            <Text className="text-sm font-medium">Carrier: {shipment.carrier || "—"}</Text>
            <Text className="text-sm font-medium">Transport Mode: {shipment.transport_mode}</Text>
            {shipment.external_reference && (
              <Text className="text-sm font-medium">Tracking / Ref: {shipment.external_reference}</Text>
            )}
            {shipment.timeline?.scenario && (
              <Text className="text-sm font-medium mt-2 text-ui-fg-subtle">
                Scenario: {shipment.timeline.scenario}
              </Text>
            )}
          </div>
        </div>
      </Container>

      <Container className="p-6 border bg-ui-bg-base rounded-lg flex flex-col gap-y-4">
        <Heading level="h2">Shipping Timeline</Heading>
        
        <div className="flex flex-col gap-y-2 mt-4">
          {shipment.timeline?.steps?.map((step: any) => (
            <div key={step.id} className="flex justify-between items-center p-4 border rounded">
              <div className="flex items-center gap-x-4">
                {step.status === "COMPLETED" ? (
                  <span className="text-green-500">✓</span>
                ) : step.status === "LOCKED" ? (
                  <span className="text-gray-400">🔒</span>
                ) : (
                  <span className="text-blue-500">⚙</span>
                )}
                <div>
                  <Text className="font-medium">{step.step_name}</Text>
                  <Text className="text-sm text-ui-fg-subtle capitalize">{step.status.toLowerCase()}</Text>
                </div>
              </div>

              {(step.status === "AVAILABLE" || step.status === "IN_PROGRESS") && (
                <Button variant="secondary" size="small" onClick={() => handleConfigureStep(step)}>
                  Configure →
                </Button>
              )}
            </div>
          ))}
        </div>
      </Container>

      {configuringStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] flex flex-col gap-y-4">
            <Heading level="h2">Configure: {configuringStep.step_name}</Heading>

            {stepError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 flex flex-col gap-y-1">
                <Text className="font-bold text-sm">Validation Error</Text>
                <Text className="text-sm">{stepError.message}</Text>
              </div>
            )}

            {renderConfigForm()}

            <div className="flex justify-end gap-x-2 mt-4">
              <Button variant="secondary" onClick={() => setConfiguringStep(null)}>Cancel</Button>
              <Button onClick={handleSaveStep}>Save & Complete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Shipment Detail",
})

export default ShipmentDetailPage
