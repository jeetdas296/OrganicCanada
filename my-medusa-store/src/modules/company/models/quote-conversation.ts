import { model } from "@medusajs/framework/utils"
import { QuoteMessage } from "./quote-message"

export const QuoteConversation = model.define("quote_conversation", {
  id: model.id({ prefix: "qconv" }).primaryKey(),
  quote_id: model.text().unique(), // The Draft Order ID or B2B Quote ID it references
  company_id: model.text(), // Reference to the company
  status: model.enum(["open", "agreement_reached", "closed"]).default("open"),
  messages: model.hasMany(() => QuoteMessage, {
    mappedBy: "conversation",
  }),
})
