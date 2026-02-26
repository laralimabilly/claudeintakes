import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { sendWhatsAppMessage } from "../_shared/whatsapp/sendMessage.ts";
import { generateMessage } from "../_shared/whatsapp/templates.ts";
import { setConversationState } from "../_shared/whatsapp/conversationState.ts";
import { sendNotificationEmail } from "../_shared/email/sendEmail.ts";
import { generateEmail } from "../_shared/email/templates.ts";
import type { VapiWebhookPayload } from "../_shared/vapi/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-secret",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret (supports both custom header and Bearer token)
    const webhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET");
    const customHeaderSecret = req.headers.get("x-vapi-secret");
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");

    const providedSecret = customHeaderSecret || bearerToken;

    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse webhook payload
    const payload: VapiWebhookPayload = await req.json();
    console.log("Received Vapi webhook:", JSON.stringify(payload, null, 2));

    // Only process end-of-call-report messages
    const messageType = payload.message?.type;
    if (messageType !== "end-of-call-report") {
      console.log(`Ignoring message type: ${messageType}`);
      return new Response(JSON.stringify({ success: true, message: `Ignored ${messageType}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract call metadata
    const callId = payload.message?.call?.id;
    const phoneNumber = payload.message?.call?.customer?.number;
    const callStatus = payload.message?.call?.status || "unknown";
    const endedReason = payload.message?.endedReason || payload.message?.call?.endedReason || "unknown";
    const callSummary = payload.message?.summary || payload.message?.transcript || "";
    const structuredData = payload.message?.structuredData;

    if (!callId) {
      console.error("No call ID found in webhook payload");
      return new Response(JSON.stringify({ error: "Missing call ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reusable call context for email templates
    const callContext = { callId, phoneNumber, callStatus, endedReason, callSummary };

    // Only process if we have structured data with meaningful content
    if (!structuredData) {
      console.log("No structured data found, acknowledging webhook");
      const email = generateEmail("call_failed", { call: callContext, failureType: "no_structured_data" });
      await sendNotificationEmail(email);
      return new Response(JSON.stringify({ success: true, message: "No structured data to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if structured data has any meaningful values (not all null/empty)
    const hasContent = Object.values(structuredData).some(
      (val) => val !== null && val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0),
    );

    if (!hasContent) {
      console.log("Structured data is empty, skipping profile creation");
      const email = generateEmail("call_failed", { call: callContext, failureType: "empty_structured_data" });
      await sendNotificationEmail(email);
      return new Response(JSON.stringify({ success: true, message: "No meaningful data to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate that we have a phone number from the call
    if (!phoneNumber) {
      console.error("No phone number available for call:", callId);
      return new Response(JSON.stringify({ error: "Phone number is required but not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require at least a name or idea description to create a meaningful profile
    const hasMinimumData = structuredData.name || structuredData.idea_description || structuredData.background;
    if (!hasMinimumData) {
      console.log("Structured data lacks minimum required fields (name/idea/background), skipping");
      const email = generateEmail("call_failed", { call: callContext, failureType: "insufficient_data" });
      await sendNotificationEmail(email);
      return new Response(JSON.stringify({ success: true, message: "Insufficient data to create profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare data for insertion - phone_number is guaranteed to be non-null
    const profileData = {
      vapi_call_id: callId,
      phone_number: phoneNumber,
      name: structuredData.name || null,
      whatsapp: structuredData.whatsapp || null,
      idea_description: structuredData.idea_description || null,
      problem_solving: structuredData.problem_solving || null,
      target_customer: structuredData.target_customer || null,
      stage: structuredData.stage || null,
      excitement_reason: structuredData.excitement_reason || null,
      background: structuredData.background || null,
      core_skills: structuredData.core_skills || null,
      previous_founder: structuredData.previous_founder || null,
      superpower: structuredData.superpower || null,
      weaknesses_blindspots: structuredData.weaknesses_blindspots || null,
      timeline_start: structuredData.timeline_start || null,
      urgency_level: structuredData.urgency_level || null,
      seeking_skills: structuredData.seeking_skills || null,
      cofounder_type: structuredData.cofounder_type || null,
      location_preference: structuredData.location_preference || null,
      commitment_level: structuredData.commitment_level || null,
      working_style: structuredData.working_style || null,
      non_negotiables: structuredData.non_negotiables || null,
      deal_breakers: structuredData.deal_breakers || null,
      equity_thoughts: structuredData.equity_thoughts || null,
      seriousness_score: structuredData.seriousness_score || null,

      match_frequency_preference: structuredData.match_frequency_preference || null,
      success_criteria: structuredData.success_criteria || null,
      willingness_to_pay: structuredData.willingness_to_pay || null,
      call_summary: callSummary,
      matched: false,
    };

    console.log("Inserting profile data for call:", callId);

    // Upsert data into founder_profiles table (phone_number is unique)
    const { data, error } = await supabase
      .from("founder_profiles")
      .upsert(profileData, {
        onConflict: "phone_number",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting founder profile:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to save profile data",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Successfully saved founder profile:", data.id);

    // Check if this is a WhatsApp conversation update (message type with transcript/response data)
    const isWhatsAppUpdate =
      messageType && ["transcript", "conversation-update", "status-update"].includes(messageType);

    if (isWhatsAppUpdate && payload.message?.transcript) {
      // Extract sentiment and highlights from the conversation
      const transcript = payload.message.transcript;
      const timestamp = new Date().toISOString();

      // Append to admin_notes with timestamp
      const existingNotes = data.admin_notes || "";
      const newNote = `\n\n[${timestamp}] WhatsApp Update:\n${transcript}`;

      const { error: notesError } = await supabase
        .from("founder_profiles")
        .update({
          admin_notes: existingNotes + newNote,
        })
        .eq("vapi_call_id", callId);

      if (notesError) {
        console.error("Error updating admin notes:", notesError);
      } else {
        console.log("Admin notes updated with WhatsApp conversation data");
      }
    }

    // Send success email notification
    const email = generateEmail("call_success", { call: callContext, profile: profileData });
    await sendNotificationEmail(email);

    // Automatically trigger embedding generation
    try {
      console.log("Triggering automatic embedding generation...");

      const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-new-founder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ founderId: data.id }),
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        console.error("Failed to trigger embedding generation:", errorText);
        // Don't fail the webhook - we can backfill embeddings later
      } else {
        const processResult = await processResponse.json();
        console.log("Embedding generation triggered:", processResult);
      }
    } catch (embeddingError) {
      console.error("Failed to trigger embedding generation:", embeddingError);
      // Don't fail the webhook
    }

    // Trigger matching computation (fire and forget)
    try {
      fetch(`${supabaseUrl}/functions/v1/compute-matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ founder_id: data.id }),
      }).catch((err) => console.error("Matching computation failed:", err));

      console.log("Triggered matching computation for founder:", data.id);
    } catch (matchingError) {
      console.error("Error triggering matching:", matchingError);
      // Don't fail the webhook
    }

    // Send WhatsApp onboarding confirmation (with delay so they're off the call)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const whatsappPhone = profileData.whatsapp || profileData.phone_number;
      const onboardingMsg = generateMessage("onboarding_confirmation", { founder: profileData });

      const sendResult = await sendWhatsAppMessage({
        to: whatsappPhone,
        body: onboardingMsg,
        supabase,
      });

      if (sendResult.success) {
        console.log("Onboarding WhatsApp sent to", whatsappPhone);

        // Initialize conversation state to IDLE
        await setConversationState(supabase, {
          founderId: data.id,
          phoneNumber: whatsappPhone,
          state: "IDLE",
        });
      } else {
        console.error("Failed to send onboarding WhatsApp:", sendResult.error);
      }
    } catch (waError) {
      console.error("Failed to send onboarding WhatsApp:", waError);
      // Don't fail the webhook
    }

    return new Response(
      JSON.stringify({
        success: true,
        profileId: data.id,
        message: "Founder profile saved, embedding generation and matching triggered",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in vapi-webhook function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
