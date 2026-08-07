import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ProposalAgreementService } from "../../../../modules/company"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = (req.query.q as string) || ""
  const currencyCode = (req.query.currency_code as string) || "usd"
  const quoteId = (req.query.quote_id as string) || undefined
  const customerId = (req as any).auth_context?.actor_id

  try {
    const result = await ProposalAgreementService.searchCatalogProducts(
      q,
      currencyCode,
      req.scope,
      { quoteId, customerId }
    )
    return res.status(200).json(result)
  } catch (err: any) {
    console.error("Store B2B Quote product search error:", err)
    return res.status(500).json({ variants: [], error: err.message })
  }
}
