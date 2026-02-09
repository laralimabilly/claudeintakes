// supabase/functions/_shared/whatsapp/sendMessage.ts
// ============================================================================
// Shared utility for sending WhatsApp messages via Twilio
// Used by: match notifications, onboarding, follow-ups, proactive messages
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SendWhatsAppResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface SendWhatsAppOptions {
  to: string;           // Phone number (e.g., "+5516999999999")
  body: string;         // Message content
  supabase?: SupabaseClient; // Optional: pass existing client to avoid re-init
}

/**
 * Normalizes a phone number to E.164 format for Twilio WhatsApp
 * Handles: "+5516...", "5516...", "whatsapp:+5516..."
 */
function normalizePhoneNumber(phone: string): string {
  // Strip "whatsapp:" prefix if present
  let cleaned = phone.replace(/^whatsapp:/, "");
  
  // Strip all non-digit and non-plus characters
  cleaned = cleaned.replace(/[^\d+]/g, "");
  
  // Ensure it starts with "+"
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Sends a WhatsApp message via Twilio and stores it in whatsapp_messages
 */
export async function sendWhatsAppMessage(
  options: SendWhatsAppOptions
): Promise<SendWhatsAppResult> {
  const { to, body } = options;

  // Validate inputs
  if (!to || !body) {
    return { success: false, error: "Missing 'to' or 'body'" };
  }

  // Get Twilio credentials
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const rawWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "+14243495938";

  if (!twilioAccountSid || !twilioAuthToken) {
    console.error("[sendWhatsApp] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
    return { success: false, error: "Twilio credentials not configured" };
  }

  // Normalize numbers
  const normalizedTo = normalizePhoneNumber(to);
  const twilioFrom = rawWhatsappNumber.startsWith("whatsapp:")
    ? rawWhatsappNumber
    : `whatsapp:${rawWhatsappNumber}`;
  const twilioTo = `whatsapp:${normalizedTo}`;

  // Initialize Supabase client for storing the message
  const supabase =
    options.supabase ||
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

  try {
    // 1. Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const formBody = new URLSearchParams({
      To: twilioTo,
      From: twilioFrom,
      Body: body,
    });

    console.log(`[sendWhatsApp] Sending to ${normalizedTo} (${body.length} chars)`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("[sendWhatsApp] Twilio API error:", twilioResponse.status, errorText);
      return {
        success: false,
        error: `Twilio error ${twilioResponse.status}: ${errorText}`,
      };
    }

    const twilioData = await twilioResponse.json();
    const messageSid = twilioData.sid;

    console.log(`[sendWhatsApp] Sent successfully: ${messageSid}`);

    // 2. Store outbound message in whatsapp_messages
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        phone_number: normalizedTo,
        message_content: body,
        twilio_message_sid: messageSid,
        is_from_user: false,
        processed: true,
        received_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[sendWhatsApp] Failed to store message:", insertError);
      // Don't fail the whole operation — message was sent
    }

    return { success: true, messageSid };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sendWhatsApp] Exception:", errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Sends multiple WhatsApp messages in sequence with a small delay
 * Useful for sending a message + follow-up in quick succession
 */
export async function sendWhatsAppMessages(
  to: string,
  messages: string[],
  delayMs = 1500,
  supabase?: SupabaseClient
): Promise<SendWhatsAppResult[]> {
  const results: SendWhatsAppResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const result = await sendWhatsAppMessage({ to, body: messages[i], supabase });
    results.push(result);

    // Small delay between messages so they arrive in order
    if (i < messages.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
