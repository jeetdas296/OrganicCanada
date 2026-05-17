import { type SubscriberConfig } from "@medusajs/medusa";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function passwordResetHandler({ event }: any) {
  const data = event.data;
  
  // 🕵️ THE DETECTIVE: Print exactly what Medusa v2 is handing us!
  console.log("\n=== 🕵️ MEDUSA EVENT PAYLOAD ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("=================================\n");

  // Let's try to grab the email from the most common v2 properties
  const targetEmail = data.email || data.identifier || data.entity_id;

  // If Medusa only gave us an ID (like "auth_usr_123") instead of an email, we need to stop!
  if (!targetEmail || !targetEmail.includes("@")) {
    console.log("❌ Medusa did not provide a raw email address! Please paste the payload from above to me!");
    return;
  }

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev", 
      to: targetEmail, 
      subject: "Reset Your Store Password",
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the secure link below to create a new one:</p>
        <a 
        href="${process.env.STOREFRONT_URL}/reset-password?token=${data.token}&email=${targetEmail}" 
        style="display: inline-block; padding: 12px 24px; background-color: #198754; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;"
        >
        Reset Password
        </a>
        </div>
      `,
    });
    
    console.log(`✅ Password reset email successfully sent to ${targetEmail}`);
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};