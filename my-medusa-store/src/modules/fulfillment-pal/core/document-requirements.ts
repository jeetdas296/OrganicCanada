// PAL Compliance & Document Requirements Layer

export interface DocumentRequirementParams {
  orderType?: "B2C" | "B2B"
  tradeType?: "DOMESTIC" | "CROSS_BORDER"
  transportMode?: string
  originCountry?: string
  destinationCountry?: string
  incoterm?: string
}

export interface DocumentRequirementResult {
  document_type: string
  required: boolean
  description?: string
}

export function getRequiredDocuments(params: DocumentRequirementParams): DocumentRequirementResult[] {
  const { orderType, tradeType } = params

  const requirements: DocumentRequirementResult[] = [
    { document_type: "COMMERCIAL_INVOICE", required: false },
    { document_type: "PACKING_LIST", required: false },
    { document_type: "CERTIFICATE_OF_ORIGIN", required: false },
    { document_type: "CUSTOMS_PREPARATION", required: false },
    { document_type: "EXPORT_DOCUMENTATION", required: false }
  ]

  // Extremely extensible logic based on PAL Scenarios.
  // In the future, you could lookup by HS Code, carrier rules, or country-specific regulations here.
  
  if (tradeType === "CROSS_BORDER") {
    setRequired(requirements, "COMMERCIAL_INVOICE", "Required for all international shipments.")
    setRequired(requirements, "CUSTOMS_PREPARATION", "Required for customs clearance.")
    setRequired(requirements, "EXPORT_DOCUMENTATION", "Basic export documentation is required.")
    
    if (orderType === "B2B") {
      setRequired(requirements, "PACKING_LIST", "Required for B2B cross-border shipments.")
    }
  }

  // B2B Domestic might require an invoice depending on rules, but by default we can leave it optional
  // until explicit business rules dictate otherwise.

  return requirements
}

function setRequired(requirements: DocumentRequirementResult[], docType: string, description: string) {
  const req = requirements.find(r => r.document_type === docType)
  if (req) {
    req.required = true
    req.description = description
  }
}
