import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ProposalAgreementService } from "../../../../modules/company"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = (req.query.q as string) || ""
  const currencyCode = (req.query.currency_code as string) || "usd"
  const quoteId = (req.query.quote_id as string) || undefined
  const customerId = (req.query.customer_id as string) || undefined
  const callerId = (req as any).auth_context?.actor_id || "admin"

  let vendorId: string | undefined = undefined

  if (callerId && callerId !== "admin") {
    const query = req.scope.resolve("query")
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "vendor.*"],
      filters: { id: callerId }
    })
    if (users.length > 0 && users[0].vendor?.id) {
      vendorId = users[0].vendor.id
    } else {
      try {
        const { data: vendors } = await query.graph({
          entity: "vendor",
          fields: ["id"],
          filters: { user_id: callerId }
        })
        if (vendors.length > 0 && vendors[0].id) {
          vendorId = vendors[0].id
        }
      } catch (e) {}
    }
  }

  try {
    const result = await ProposalAgreementService.searchCatalogProducts(
      q,
      currencyCode,
      req.scope,
      { quoteId, customerId, vendorId }
    )
    return res.status(200).json(result)
  } catch (err: any) {
    console.error("Admin B2B Quote product search error:", err)
    return res.status(500).json({ variants: [], error: err.message })
  }
}
