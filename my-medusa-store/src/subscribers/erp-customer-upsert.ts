import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function erpCustomerUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const erpModuleService = container.resolve("erp")
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  logger.info(`[ERPNext Subscriber] Customer event detected for customer: ${data.id}. Syncing to ERP...`)
  
  try {
    const { data: [customer] } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "phone"],
      filters: { id: data.id }
    })

    if (!customer) {
      logger.error(`[ERPNext Subscriber] Customer ${data.id} not found.`)
      return
    }

    const erpName = await erpModuleService.syncCustomer(customer)
    logger.info(`[ERPNext Subscriber] Customer ${data.id} successfully synced to ERPNext as ${erpName}.`)
  } catch (error: any) {
    logger.error(`[ERPNext Subscriber] Failed to sync customer ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["customer.created", "customer.updated"],
}
