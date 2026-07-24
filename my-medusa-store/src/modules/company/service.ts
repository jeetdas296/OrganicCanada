import { MedusaService } from "@medusajs/framework/utils"
import { Company } from "./models/company"
import { QuoteConversation } from "./models/quote-conversation"
import { QuoteMessage } from "./models/quote-message"

class CompanyService extends MedusaService({
  Company,
  QuoteConversation,
  QuoteMessage,
}) {
  /**
   * Resolves the Company entity linked to a given Customer ID using the Remote Query graph.
   */
  async getCompanyForCustomer(customerId: string, query: any) {
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "company.*"],
      filters: { id: customerId }
    })
    
    const customer = data?.[0]
    return Array.isArray(customer?.company) ? customer?.company[0] : customer?.company
  }

  /**
   * Verifies if two customers belong to the same Company.
   */
  async isCustomerInSameCompany(callerId: string, targetCustomerId: string, query: any) {
    if (callerId === targetCustomerId) return true

    const company = await this.getCompanyForCustomer(callerId, query)
    if (!company) return false

    const { data: companyData } = await query.graph({
      entity: "company",
      fields: ["id", "customers.*"],
      filters: { id: company.id }
    })

    const customers = companyData?.[0]?.customers || []
    return customers.some((c: any) => c.id === targetCustomerId)
  }
}

export default CompanyService
