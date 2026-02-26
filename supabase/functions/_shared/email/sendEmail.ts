import { Resend } from "https://esm.sh/resend@4.0.0";

export interface SendEmailOptions {
  subject: string;
  html: string;
}

export async function sendNotificationEmail(options: SendEmailOptions): Promise<void> {
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!apiKey || !adminEmail) {
      console.warn("Email not configured: missing RESEND_API_KEY or ADMIN_EMAIL");
      return;
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Meetline AI <onboarding@resend.dev>",
      to: [adminEmail],
      subject: options.subject,
      html: options.html,
    });
    console.log("Notification email sent:", options.subject);
  } catch (err: any) {
    console.error("Failed to send notification email:", err.message);
  }
}
