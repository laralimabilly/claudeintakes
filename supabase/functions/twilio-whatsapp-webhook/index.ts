// supabase/functions/twilio-whatsapp-webhook/index.ts
// ============================================================================
// WhatsApp Webhook — State-aware message handler
//
// Flow:
//   1. Verify Twilio signature
//   2. Store incoming message
//   3. Check if founder exists (if not → one-time registration message)
//   4. Check conversation state:
//      - If in match flow → handle state transitions
//      - If IDLE or no state → AI chat
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { sendWhatsAppMessage } from "../_shared/whatsapp/sendMessage.ts";
import { generateMessage } from "../_shared/whatsapp/templates.ts";
import {
  getConversation,
  getConversationByFounderId,
  detectIntent,
  getNextState,
  transitionState,
  resetToIdle,
  setConversationState,
  isInMatchFlow,
} from "../_shared/whatsapp/conversationState.ts";
import type { ConversationRecord, ConversationContext } from "../_shared/whatsapp/conversationState.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

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

// ---------------------------------------------------------------------------
// Helpers: Twilio Signature Verification
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((key) => key + params[key]).join("");
  const data = url + paramString;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = arrayBufferToBase64(signatureBuffer);

  return signature === expectedSignature;
}

// ---------------------------------------------------------------------------
// Helpers: Founder lookup
// ---------------------------------------------------------------------------

async function getFounderByPhone(supabase: any, phoneNumber: string) {
  const { data, error } = await supabase
    .from("founder_profiles")
    .select("id, name, phone_number, whatsapp, idea_description, core_skills, seeking_skills, stage, cofounder_type, location_preference, commitment_level, working_style, timeline_start, background, superpower, previous_founder")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("Error fetching founder profile:", error);
    return null;
  }
  return data;
}

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

// ---------------------------------------------------------------------------
// Helpers: Conversation history & AI
// ---------------------------------------------------------------------------

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
  return (data || []).reverse();
}

async function generateAIResponse(
  userMessage: string,
  conversationHistory: any[],
  matchContextPrompt?: string
): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    console.error("Missing OPENAI_API_KEY");
    return "Sorry, I'm having technical difficulties. Please try again later.";
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    let systemContent = SYSTEM_PROMPT;
    if (matchContextPrompt) {
      systemContent += `\n\nCURRENT MATCH CONTEXT:\n${matchContextPrompt}`;
    }

    const messages: any[] = [{ role: "system", content: systemContent }];

    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.is_from_user ? "user" : "assistant",
        content: msg.message_content,
      });
    });

    messages.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices[0].message.content || "I'm not sure how to respond to that. Can you rephrase?";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, I'm having trouble processing that. Could you try again?";
  }
}

// ---------------------------------------------------------------------------
// Helpers: Fetch match + profiles for state transitions
// ---------------------------------------------------------------------------

async function fetchMatchAndProfiles(supabase: any, matchId: string) {
  const { data: match, error: matchError } = await supabase
    .from("founder_matches")
    .select("id, founder_id, matched_founder_id, total_score, compatibility_level, status, score_skills, score_stage, score_communication, score_vision, score_values, score_geo, score_advantages")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    console.error("Error fetching match:", matchError);
    return null;
  }

  const { data: founders, error: foundersError } = await supabase
    .from("founder_profiles")
    .select("id, name, phone_number, whatsapp, idea_description, core_skills, seeking_skills, stage, cofounder_type, location_preference, commitment_level, working_style, timeline_start, background, superpower, previous_founder")
    .in("id", [match.founder_id, match.matched_founder_id]);

  if (foundersError || !founders || founders.length < 2) {
    console.error("Error fetching founders:", foundersError);
    return null;
  }

  return { match, founders };
}

function buildMatchData(match: any) {
  return {
    total_score: match.total_score,
    compatibility_level: match.compatibility_level || (match.total_score >= 75 ? "highly_compatible" : "somewhat_compatible"),
    score_skills: Number(match.score_skills) || 0,
    score_stage: Number(match.score_stage) || 0,
    score_communication: Number(match.score_communication) || 0,
    score_vision: Number(match.score_vision) || 0,
    score_values: Number(match.score_values) || 0,
    score_geo: Number(match.score_geo) || 0,
    score_advantages: Number(match.score_advantages) || 0,
  };
}

// ---------------------------------------------------------------------------
// State Machine Handler
// ---------------------------------------------------------------------------

/**
 * Handle a message from a founder who is in an active match flow.
 * Returns the reply string, or null if the AI chat fallback should handle it.
 */
async function handleMatchFlowMessage(
  supabase: any,
  conversation: ConversationRecord,
  messageBody: string,
  phoneNumber: string
): Promise<string | null> {
  const intent = detectIntent(messageBody);
  const nextState = getNextState(conversation.current_state, intent);
  const ctx = conversation.context;

  console.log(`[matchFlow] state=${conversation.current_state} intent=${intent} next=${nextState} match=${ctx.match_id}`);

  // ---- No transition → fall through to AI with match context ----
  if (nextState === null) {
    return null;
  }

  // ---- MATCH_NOTIFIED + positive → MATCH_DETAILS_SENT ----
  if (conversation.current_state === "MATCH_NOTIFIED" && nextState === "MATCH_DETAILS_SENT") {
    if (!ctx.match_id) return null;

    const result = await fetchMatchAndProfiles(supabase, ctx.match_id);
    if (!result) return "Something went wrong pulling up the details. Give me a sec and try again.";

    const { match, founders } = result;
    const thisFounder = founders.find((f: any) => f.id === conversation.founder_id);
    const otherFounder = founders.find((f: any) => f.id === ctx.other_founder_id);
    if (!thisFounder || !otherFounder) return null;

    const matchData = buildMatchData(match);
    const templateName = matchData.compatibility_level === "highly_compatible"
      ? "highly_compatible_details"
      : "somewhat_compatible_details";

    const reply = generateMessage(templateName, {
      founder: thisFounder,
      other: otherFounder,
      match: matchData,
    });

    await transitionState(supabase, phoneNumber, "MATCH_DETAILS_SENT");
    return reply;
  }

  // ---- MATCH_DETAILS_SENT + positive → INTRO_CONFIRMED ----
  if (conversation.current_state === "MATCH_DETAILS_SENT" && nextState === "INTRO_CONFIRMED") {
    if (!ctx.match_id || !ctx.other_founder_id) return null;

    const result = await fetchMatchAndProfiles(supabase, ctx.match_id);
    if (!result) return "Something went wrong. Give me a moment.";

    const { match, founders } = result;
    const thisFounder = founders.find((f: any) => f.id === conversation.founder_id);
    const otherFounder = founders.find((f: any) => f.id === ctx.other_founder_id);
    if (!thisFounder || !otherFounder) return null;

    const matchData = buildMatchData(match);
    const side = ctx.side || "a";

    // Update this founder's interest
    const interestCol = side === "a" ? "a_interested" : "b_interested";
    await supabase
      .from("founder_matches")
      .update({ [interestCol]: true })
      .eq("id", match.id);

    // Check if OTHER founder already confirmed (side 'b' confirming after 'a')
    const otherSide = side === "a" ? "b" : "a";
    const otherInterestCol = otherSide === "a" ? "a_interested" : "b_interested";
    const otherAlreadyInterested = match[otherInterestCol] === true;

    if (otherAlreadyInterested) {
      // BOTH interested!
      await supabase
        .from("founder_matches")
        .update({ status: "both_interested" })
        .eq("id", match.id);

      // Send bothInterested to BOTH founders
      const msgForThis = generateMessage("both_interested", { founder: thisFounder, other: otherFounder });
      const msgForOther = generateMessage("both_interested", { founder: otherFounder, other: thisFounder });

      const otherPhone = otherFounder.whatsapp || otherFounder.phone_number;

      // Send to the other founder
      await sendWhatsAppMessage({ to: otherPhone, body: msgForOther, supabase });

      // Set both to INTRO_SENT
      await transitionState(supabase, phoneNumber, "INTRO_SENT");
      const otherConv = await getConversationByFounderId(supabase, otherFounder.id);
      if (otherConv) {
        await transitionState(supabase, otherConv.phone_number, "INTRO_SENT");
      }

      return msgForThis;
    }

    // Not both interested yet — notify the other founder (side 'b')
    const introConfirmMsg = generateMessage("intro_confirmation", { founder: thisFounder, other: otherFounder });

    // Now notify the OTHER founder with initial match template
    const otherPhone = otherFounder.whatsapp || otherFounder.phone_number;
    const otherTemplateName = matchData.total_score >= 75
      ? "highly_compatible_initial"
      : "somewhat_compatible_initial";

    const otherMsg = generateMessage(otherTemplateName, {
      founder: otherFounder,
      other: thisFounder,
      match: matchData,
    });

    await sendWhatsAppMessage({ to: otherPhone, body: otherMsg, supabase });

    // Set other founder's state to MATCH_NOTIFIED
    await setConversationState(supabase, {
      founderId: otherFounder.id,
      phoneNumber: otherPhone,
      state: "MATCH_NOTIFIED",
      context: {
        match_id: match.id,
        other_founder_id: thisFounder.id,
        other_founder_name: thisFounder.name || "your match",
        score: Math.round(match.total_score),
        compatibility_level: matchData.compatibility_level,
        side: "b",
      },
    });

    // Update match status
    await supabase
      .from("founder_matches")
      .update({ status: "notified_b" })
      .eq("id", match.id);

    // Set THIS founder to WAITING_FOR_OTHER
    await transitionState(supabase, phoneNumber, "WAITING_FOR_OTHER");

    return introConfirmMsg;
  }

  // ---- DECLINE flows (MATCH_NOTIFIED or MATCH_DETAILS_SENT + negative) ----
  if (
    (conversation.current_state === "MATCH_NOTIFIED" || conversation.current_state === "MATCH_DETAILS_SENT") &&
    nextState === "DECLINE_FEEDBACK"
  ) {
    const side = ctx.side || "a";
    const interestCol = side === "a" ? "a_interested" : "b_interested";

    if (ctx.match_id) {
      await supabase
        .from("founder_matches")
        .update({ [interestCol]: false })
        .eq("id", ctx.match_id);
    }

    await transitionState(supabase, phoneNumber, "DECLINE_FEEDBACK");
    return generateMessage("decline_feedback", { founder: { phone_number: phoneNumber } });
  }

  // ---- DECLINE_FEEDBACK + any → IDLE ----
  if (conversation.current_state === "DECLINE_FEEDBACK" && nextState === "IDLE") {
    const side = ctx.side || "a";
    const declineStatus = side === "a" ? "a_declined" : "b_declined";

    if (ctx.match_id) {
      await supabase
        .from("founder_matches")
        .update({ status: declineStatus })
        .eq("id", ctx.match_id);
    }

    // Notify the other founder if they were in WAITING_FOR_OTHER
    if (ctx.other_founder_id) {
      const otherConv = await getConversationByFounderId(supabase, ctx.other_founder_id);
      if (otherConv && otherConv.current_state === "WAITING_FOR_OTHER") {
        const { data: otherFounder } = await supabase
          .from("founder_profiles")
          .select("id, name, phone_number, whatsapp, idea_description, core_skills, seeking_skills, stage, cofounder_type, location_preference, commitment_level, working_style, timeline_start, background, superpower, previous_founder")
          .eq("id", ctx.other_founder_id)
          .maybeSingle();

        const { data: thisFounder } = await supabase
          .from("founder_profiles")
          .select("id, name, phone_number, whatsapp")
          .eq("id", conversation.founder_id)
          .maybeSingle();

        if (otherFounder && thisFounder) {
          const declinedMsg = generateMessage("other_declined", {
            founder: otherFounder,
            other: thisFounder,
          });
          const otherPhone = otherFounder.whatsapp || otherFounder.phone_number;
          await sendWhatsAppMessage({ to: otherPhone, body: declinedMsg, supabase });
        }

        await resetToIdle(supabase, otherConv.phone_number);
      }
    }

    // Store decline reason in context before resetting
    await transitionState(supabase, phoneNumber, "IDLE", { decline_reason: messageBody });
    // Then fully reset
    await resetToIdle(supabase, phoneNumber);

    return generateMessage("decline_feedback", { founder: { phone_number: phoneNumber }, meta: {} });
  }

  // ---- FOLLOWUP_PENDING + any → IDLE ----
  if (conversation.current_state === "FOLLOWUP_PENDING" && nextState === "IDLE") {
    await resetToIdle(supabase, phoneNumber);
    return "Thanks for the update. I'll keep looking for more matches for you.";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!twilioAuthToken) {
      console.error("Missing TWILIO_AUTH_TOKEN");
      return new Response("Server configuration error", { status: 500 });
    }

    const twilioSignature = req.headers.get("X-Twilio-Signature");
    if (!twilioSignature) {
      console.warn("Missing X-Twilio-Signature header");
      return new Response("Unauthorized: Missing signature", { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Verify signature
    const publicSupabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${publicSupabaseUrl}/functions/v1/twilio-whatsapp-webhook`;
    const isValid = await verifyTwilioSignature(twilioAuthToken, twilioSignature, webhookUrl, params);

    if (!isValid) {
      console.warn("Invalid Twilio signature");
      return new Response("Forbidden: Invalid signature", { status: 403 });
    }

    console.log("Twilio signature verified");

    const body = params["Body"] || "";
    const from = params["From"] || "";
    const messageSid = params["MessageSid"] || "";
    const phoneNumber = from.replace("whatsapp:", "");

    console.log("Incoming WhatsApp:", { Body: body, From: from, phoneNumber });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store incoming message
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert([{
        phone_number: phoneNumber,
        message_content: body,
        twilio_message_sid: messageSid,
        is_from_user: true,
        created_at: new Date().toISOString(),
        processed: false,
      }]);

    if (insertError) {
      console.error("Error storing message:", insertError);
    }

    // Check if founder exists
    const founder = await getFounderByPhone(supabase, phoneNumber);

    if (!founder) {
      console.log("No founder profile for:", phoneNumber);

      const alreadyNotified = await hasReceivedNotRegisteredMessage(supabase, phoneNumber);

      if (!alreadyNotified) {
        const notRegisteredMessage =
          "Hey! 👋 I don't have a record of you in our system yet. To chat with me about finding a co-founder, please complete a quick intake call first at https://meetline.ai — then message me back!";

        await sendWhatsAppMessage({ to: from, body: notRegisteredMessage, supabase });
      } else {
        console.log("Already notified, ignoring:", phoneNumber);
      }

      return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "application/xml" } });
    }

    // ---- State-aware handling ----
    const conversation = await getConversation(supabase, phoneNumber);

    if (conversation && isInMatchFlow(conversation.current_state)) {
      console.log(`[matchFlow] Founder ${founder.id} in state ${conversation.current_state}`);

      const matchFlowReply = await handleMatchFlowMessage(supabase, conversation, body, phoneNumber);

      if (matchFlowReply) {
        // Send the state machine response
        await sendWhatsAppMessage({ to: from, body: matchFlowReply, supabase });

        return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "application/xml" } });
      }

      // matchFlowReply is null → question intent, fall through to AI with context
      console.log("[matchFlow] No transition, falling through to AI with match context");

      const matchContextPrompt = `The user is currently in a match flow. They were shown a match with ${conversation.context.other_founder_name || "another founder"} (score: ${conversation.context.score || "unknown"}%). Current state: ${conversation.current_state}. Answer their question about this match using the data available. If they seem to be asking a yes/no question about the match, guide them to respond with a clear yes or no.`;

      const conversationHistory = await getConversationHistory(supabase, phoneNumber);
      const aiResponse = await generateAIResponse(body, conversationHistory, matchContextPrompt);

      await sendWhatsAppMessage({ to: from, body: aiResponse, supabase });

      return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "application/xml" } });
    }

    // ---- IDLE or no state: standard AI chat ----
    const conversationHistory = await getConversationHistory(supabase, phoneNumber);
    const aiResponse = await generateAIResponse(body, conversationHistory);

    await sendWhatsAppMessage({ to: from, body: aiResponse, supabase });

    return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "application/xml" } });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "application/xml" } });
  }
});
