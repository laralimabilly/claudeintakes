import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { sendWhatsAppMessage } from "../_shared/whatsapp/sendMessage.ts";
import { generateMessage } from "../_shared/whatsapp/templates.ts";
import { setConversationState } from "../_shared/whatsapp/conversationState.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-secret",
};

interface VapiWebhookPayload {
  message?: {
    type?: string;
    call?: {
      id: string;
      customer?: {
        number?: string;
      };
      status?: string;
      endedReason?: string;
    };
    transcript?: string;
    summary?: string;
    structuredData?: {
      name?: string;
      whatsapp?: string;
      idea_description?: string;
      problem_solving?: string;
      target_customer?: string;
      stage?: string;
      excitement_reason?: string;
      background?: string;
      core_skills?: string[];
      previous_founder?: boolean;
      superpower?: string;
      weaknesses_blindspots?: string[];
      timeline_start?: string;
      urgency_level?: string;
      seeking_skills?: string[];
      cofounder_type?: string;
      location_preference?: string;
      commitment_level?: string;
      working_style?: string;
      non_negotiables?: string[];
      deal_breakers?: string[];
      equity_thoughts?: string;
      seriousness_score?: number;
      
      match_frequency_preference?: string;
      success_criteria?: string;
      willingness_to_pay?: string;
    };
  };
}

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
    const callSummary = payload.message?.summary || payload.message?.transcript || "";
    const structuredData = payload.message?.structuredData;

    if (!callId) {
      console.error("No call ID found in webhook payload");
      return new Response(JSON.stringify({ error: "Missing call ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process if we have structured data with meaningful content
    if (!structuredData) {
      console.log("No structured data found, acknowledging webhook");
      return new Response(JSON.stringify({ success: true, message: "No structured data to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if structured data has any meaningful values (not all null/empty)
    const hasContent = Object.values(structuredData).some(
      (val) => val !== null && val !== undefined && val !== "" && 
               !(Array.isArray(val) && val.length === 0)
    );

    if (!hasContent) {
      console.log("Structured data is empty, skipping profile creation");
      return new Response(JSON.stringify({ success: true, message: "No meaningful data to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine the phone number to use - prefer Vapi payload, fallback to existing record
    let finalPhoneNumber = phoneNumber || null;

    // If no phone number from Vapi, try to get it from existing record (pre-created by start-call)
    if (!finalPhoneNumber) {
      const { data: existingProfile } = await supabase
        .from("founder_profiles")
        .select("phone_number")
        .eq("vapi_call_id", callId)
        .single();

      if (existingProfile?.phone_number) {
        finalPhoneNumber = existingProfile.phone_number;
        console.log("Using phone number from pre-created profile:", finalPhoneNumber);
      }
    }

    // Validate that we have a phone number
    if (!finalPhoneNumber) {
      console.error("No phone number available for call:", callId);
      return new Response(JSON.stringify({ error: "Phone number is required but not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare data for insertion - phone_number is guaranteed to be non-null
    const profileData = {
      vapi_call_id: callId,
      phone_number: finalPhoneNumber,
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

    // Send email notification
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      const adminEmail = Deno.env.get("ADMIN_EMAIL");

      if (adminEmail) {
        await resend.emails.send({
          from: "Foundry AI <onboarding@resend.dev>",
          to: [adminEmail],
          subject: "🎉 New Founder Interview Completed",
          html: `
            <h1>New Founder Profile Submitted</h1>
            <p>A new founder has completed their interview via Vapi!</p>
            
            <h2>Quick Summary:</h2>
            <ul>
              <li><strong>WhatsApp:</strong> ${profileData.whatsapp || "N/A"}</li>
              <li><strong>Phone:</strong> ${profileData.phone_number || "N/A"}</li>
              <li><strong>Idea:</strong> ${profileData.idea_description || "N/A"}</li>
              <li><strong>Stage:</strong> ${profileData.stage || "N/A"}</li>
              <li><strong>Seeking:</strong> ${profileData.seeking_skills?.join(", ") || "N/A"}</li>
              <li><strong>Location Preference:</strong> ${profileData.location_preference || "N/A"}</li>
              <li><strong>Seriousness Score:</strong> ${profileData.seriousness_score || "N/A"}/10</li>
            </ul>
            
            <p><a href="https://founderkit.tools/admin">View Full Profile in Admin Dashboard</a></p>
            
            <hr>
            <p style="color: #666; font-size: 12px;">Call ID: ${callId}</p>
          `,
        });
        console.log("Email notification sent to:", adminEmail);
      }
    } catch (emailError: any) {
      // Log but don't fail the webhook if email fails
      console.error("Failed to send email notification:", emailError.message);
    }

    // Automatically trigger embedding generation
    try {
      console.log("Triggering automatic embedding generation...");
      
      const processResponse = await fetch(
        `${supabaseUrl}/functions/v1/process-new-founder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ founderId: data.id }),
        }
      );

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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ founder_id: data.id })
      }).catch(err => console.error('Matching computation failed:', err));
      
      console.log('Triggered matching computation for founder:', data.id);
    } catch (matchingError) {
      console.error('Error triggering matching:', matchingError);
      // Don't fail the webhook
    }

    // Send WhatsApp onboarding confirmation (with delay so they're off the call)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

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
