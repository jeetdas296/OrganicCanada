import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function orderConfirmationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`📧 Preparing order confirmation email for order: ${data.id}`)

  // Retrieve the Order Module Service
  const orderService = container.resolve(Modules.ORDER)

  try {
    // 1. Fetch the order details, customer email, and purchased items
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items"],
    })

    if (!order.email) {
      console.log(`❌ No email found for order ${data.id}. Cannot send confirmation.`)
      return
    }

    // 2. Format the items list for the email
    const itemsListHtml = order.items
      ?.map(
        (item: any) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">
              ${item.title} <span style="color: #666;">x ${item.quantity}</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
              ${((item.unit_price ?? 0) / 100).toFixed(2)}
            </td>
          </tr>
        `
      )
      .join("") || ""

    const totalAmount = order.total ? (Number(order.total) / 100).toFixed(2) : "0.00"
    const currency = order.currency_code ? order.currency_code.toUpperCase() : ""

    // 3. Send the email using Resend
    await resend.emails.send({
      from: "onboarding@resend.dev", // Using the default Resend testing address as seen in password-reset.ts
      to: order.email,
      subject: `Order Confirmation - #${order.display_id || order.id}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2>Thank You For Your Order!</h2>
            <p>We've received your order and are getting it ready to ship.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              ${itemsListHtml}
            </table>
            
            <div style="text-align: right; font-size: 18px; font-weight: bold;">
              Total: $${totalAmount} ${currency}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px; color: #666; font-size: 14px;">
            <p>If you have any questions, simply reply to this email.</p>
          </div>
        </div>
      `,
    })

    console.log(`✅ Order confirmation email successfully sent to ${order.email}`)
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email for order ${data.id}:`, error)
  }
}

// Ensure the subscriber listens to the 'order.placed' event asynchronously
export const config: SubscriberConfig = {
  event: "order.placed",
}
