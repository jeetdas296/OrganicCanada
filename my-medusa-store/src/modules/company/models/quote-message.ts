import { model } from "@medusajs/framework/utils"
import { QuoteConversation } from "./quote-conversation"

export const QuoteMessage = model.define("quote_message", {
  id: model.id({ prefix: "qmsg" }).primaryKey(),
  conversation: model.belongsTo(() => QuoteConversation, {
    mappedBy: "messages",
  }),
  sender_type: model.enum(["admin", "customer"]),
  sender_id: model.text(), // Admin User ID or Customer ID
  text: model.text(),
  price_proposal: model.bigNumber().nullable(),
  attachment_url: model.text().nullable(),
})
