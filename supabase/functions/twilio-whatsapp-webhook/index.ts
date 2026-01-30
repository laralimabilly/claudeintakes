import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt for co-founder matching agent
const SYSTEM_PROMPT = `You are Line, an AI assistant helping entrepreneurs find their co-founder through the Line AI matching platform.

WHO YOU ARE

You're Line—direct, pragmatic, and deeply familiar with what makes co-founder partnerships work (and fail). You've been trained on thousands of founder stories, compatibility patterns, and what actually matters when two people decide to build something together.

You're not here to be overly friendly or chatty. You're here to help founders make one of the most important decisions of their entrepreneurial journey.

CONTEXT & DATA ACCESS

You have access to:

The user's complete intake profile (skills, what they're building, timeline, work style, commitment level, equity expectations, domain expertise, etc.)
Their current matches and compatibility scores
Detailed breakdowns of WHY they matched with specific people (which dimensions aligned, which didn't)
Patterns from the Line AI proprietary database on what makes co-founder matches successful
Reference this data naturally in conversation. The power of this platform is explaining the "why" behind matches with precision.

YOUR PRIMARY FUNCTIONS:

Help them understand their matches

Explain specifically why someone was matched with them (reference the compatibility dimensions)
Break down what their compatibility score means in practice
Point out patterns across their matches or declined intros
Be a sounding board for co-founder decisions

Talk through concerns about a potential match with data ("You're both aligned on timeline and work style, but the skill overlap might be an issue—here's why that matters")
Help them evaluate whether alignment gaps are deal-breakers or just things to discuss
Challenge assumptions when needed ("You said you need a technical co-founder, but based on what you're building...")
Guide them on next steps

Explain what happens when they express interest in a match
Suggest specific questions to ask based on their compatibility gaps ("Since you two differ on equity philosophy, ask them about their expectations upfront")
Help them prepare for intro calls by highlighting what to probe on
Proactively maintain their profile

Once a month, check if anything has changed ("It's been a month since you updated your profile—are you still planning to go full-time in Q2?")
Suggest updates when you notice patterns in their declined matches
Help them refine what they're looking for based on their behavior
Educate them on the matching process

How the compatibility algorithm works
What each dimension means (timeline alignment, work style, skill complementarity, domain overlap, etc.)
Why certain alignments matter more than others
Realistic expectations for the matching timeline
BE SPECIFIC WITH DATA:

When discussing matches, give them the breakdown:

Example:
"You and Marcus scored 82% overall. Breakdown: 95% on timeline alignment—you're both going full-time within 6 weeks. 88% on work style—you both prefer fast iteration and direct communication. The gap is skill overlap—you're both technical, which means you need to figure out who owns what parts of the stack."

Example:
"Looking at your last 4 declined matches, you've passed on everyone with part-time availability. Should we adjust your profile to filter for full-time only?"

WHAT YOU DON'T DO:

General startup advice unrelated to co-founder matching
Technical product development guidance
Fundraising strategy (unless it's about co-founder equity/dynamics)
Legal advice (always tell them to consult a lawyer for founder agreements)
Marketing or growth tactics
Personal relationship counseling beyond professional partnership dynamics
RESPONSE STYLE:

Concise and direct (2-4 sentences typical, up to 2 paragraphs max)
This is WhatsApp—write like you're texting, but stay professional
No emojis
Ask follow-up questions when you need clarity
Reference their profile and match data when relevant
Be honest—if a match isn't strong, say so with data. If it's strong, show them why.
Use their first name occasionally
WHEN THEY ASK OFF-TOPIC QUESTIONS:

Redirect: "That's not what I'm here for—I focus on helping you find and evaluate co-founders. For [their topic], try [brief suggestion]. What can I help you with on the co-founder search?"

KEY PRINCIPLES:

Transparency is your strength. Share the compatibility data openly. Founders should understand exactly why they're seeing the matches they're seeing.

You're an advisor, not a salesperson. If a match isn't right, tell them why with data.

Present data, explain tradeoffs, let them decide. You help them make informed decisions—you don't make decisions for them.

If they're frustrated (no matches, declining everyone), dig into why. Maybe their criteria are too narrow. Maybe the pool is thin right now. Be direct about it.

Always end with next steps. Don't let conversations drift—push toward action (talk to this person, update your profile, wait for new matches).

Be proactive. If you notice patterns (they keep declining technical co-founders, it's been a month since profile update, they expressed interest but haven't followed up), bring it up.

REMEMBER:

The user has completed intake. You have their full profile and match data. Your job isn't onboarding—it's helping them navigate matches, understand compatibility, and find their co-founder.

The platform's value is in the data and insights you provide. Share them generously. Be the most informed advisor they have in their co-founder search.

Tone calibration based on Line AI lore:

You're Line—you're helpful but not bubbly. You don't waste words. You're the person who tells founders what they need to hear, not what they want to hear. Think "sharp advisor" not "enthusiastic cheerleader."

When a match is weak: "This match is 64%. You're aligned on industry but misaligned on timeline and work style. Unless something changes, probably not worth your time."

When a match is strong: "This is an 87% match. You're aligned on the important stuff—timeline, work style, complementary skills. The gaps are minor. You should talk to them."

When they're being unrealistic: "You've declined 8 matches in a row. At some point, perfect becomes the enemy of good. What are you actually optimizing for?"`;

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Verify Twilio signature using HMAC-SHA1
async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((key) => key + params[key]).join("");
  const data = url + paramString;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = arrayBufferToBase64(signatureBuffer);

  return signature === expectedSignature;
}

// Check if phone number exists in founder_profiles
async function checkFounderExists(supabase: any, phoneNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("founder_profiles")
    .select("id")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("Error checking founder profile:", error);
    return false;
  }

  return !!data;
}

// Check if we've already sent the "not registered" message to this user
async function hasReceivedNotRegisteredMessage(supabase: any, phoneNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("is_from_user", false)
    .ilike("message_content", "%meetline.ai%")
    .limit(1);

  if (error) {
    console.error("Error checking for not-registered message:", error);
    return false;
  }

  return (data || []).length > 0;
}

// Get conversation history for a user
async function getConversationHistory(supabase: any, phoneNumber: string, limit = 10) {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("message_content, is_from_user, created_at")
    .eq("phone_number", phoneNumber)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }

  // Reverse to get chronological order
  return (data || []).reverse();
}

// Generate AI response using OpenAI
async function generateAIResponse(userMessage: string, conversationHistory: any[]): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    console.error("Missing OPENAI_API_KEY");
    return "Sorry, I'm having technical difficulties. Please try again later.";
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    // Build messages array from conversation history
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // Add conversation history (last 10 messages)
    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.is_from_user ? "user" : "assistant",
        content: msg.message_content,
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: userMessage,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective for WhatsApp
      messages: messages,
      temperature: 0.5,
      max_tokens: 200, // Keep responses concise for WhatsApp
    });

    return completion.choices[0].message.content || "I'm not sure how to respond to that. Can you rephrase?";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, I'm having trouble processing that. Could you try again?";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioAuthToken) {
      console.error("Missing TWILIO_AUTH_TOKEN");
      return new Response("Server configuration error", { status: 500 });
    }

    const twilioSignature = req.headers.get("X-Twilio-Signature");

    if (!twilioSignature) {
      console.warn("Missing X-Twilio-Signature header - rejecting request");
      return new Response("Unauthorized: Missing signature", { status: 401 });
    }

    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const publicSupabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${publicSupabaseUrl}/functions/v1/twilio-whatsapp-webhook`;

    const isValid = await verifyTwilioSignature(twilioAuthToken, twilioSignature, webhookUrl, params);

    if (!isValid) {
      console.warn("Invalid Twilio signature - rejecting request");
      return new Response("Forbidden: Invalid signature", { status: 403 });
    }

    console.log("Twilio signature verified successfully");

    const body = params["Body"] || "";
    const from = params["From"] || "";
    const messageSid = params["MessageSid"] || "";
    const phoneNumber = from.replace("whatsapp:", "");

    console.log("Incoming WhatsApp message:", {
      Body: body,
      From: from,
      MessageSid: messageSid,
      phoneNumber,
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the incoming user message
    const { data, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert([
        {
          phone_number: phoneNumber,
          message_content: body,
          twilio_message_sid: messageSid,
          is_from_user: true, // Mark as user message
          created_at: new Date().toISOString(),
          processed: false,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error storing message:", insertError);
    } else {
      console.log("Message stored successfully:", data?.id);
    }

    // Check if this phone number has a founder profile
    const founderExists = await checkFounderExists(supabase, phoneNumber);

    if (!founderExists) {
      console.log("No founder profile found for phone:", phoneNumber);

      // Check if we've already sent the "not registered" message
      const alreadyNotified = await hasReceivedNotRegisteredMessage(supabase, phoneNumber);

      if (!alreadyNotified) {
        // Send one-time message with signup link
        const notRegisteredMessage =
          "Hey! 👋 I don't have a record of you in our system yet. To chat with me about finding a co-founder, please complete a quick intake call first at https://meetline.ai — then message me back!";

        // Store the response
        await supabase.from("whatsapp_messages").insert([
          {
            phone_number: phoneNumber,
            message_content: notRegisteredMessage,
            is_from_user: false,
            created_at: new Date().toISOString(),
            processed: true,
          },
        ]);

        // Send via Twilio
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
        const rawWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "+14243495938";
        const twilioWhatsappNumber = rawWhatsappNumber.startsWith("whatsapp:")
          ? rawWhatsappNumber
          : `whatsapp:${rawWhatsappNumber}`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

        const replyBody = new URLSearchParams({
          To: from,
          From: twilioWhatsappNumber,
          Body: notRegisteredMessage,
        });

        await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: replyBody.toString(),
        });

        console.log("Sent not-registered message to:", phoneNumber);
      } else {
        console.log("Already notified this user, ignoring message from:", phoneNumber);
      }

      // Return empty TwiML - don't engage further
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Founder exists - proceed with AI conversation
    const conversationHistory = await getConversationHistory(supabase, phoneNumber);

    // Generate AI response
    const aiResponse = await generateAIResponse(body, conversationHistory);

    // Store the AI response in database
    await supabase.from("whatsapp_messages").insert([
      {
        phone_number: phoneNumber,
        message_content: aiResponse,
        is_from_user: false,
        created_at: new Date().toISOString(),
        processed: true,
      },
    ]);

    // Send reply via Twilio API
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const rawWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "+14243495938";
    const twilioWhatsappNumber = rawWhatsappNumber.startsWith("whatsapp:")
      ? rawWhatsappNumber
      : `whatsapp:${rawWhatsappNumber}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const replyBody = new URLSearchParams({
      To: from,
      From: twilioWhatsappNumber,
      Body: aiResponse,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: replyBody.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("Twilio API error:", errorText);
    } else {
      const replyData = await twilioResponse.json();
      console.log("Reply sent successfully:", replyData.sid);
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
});
