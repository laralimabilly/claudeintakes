import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  founderIds: string[];
}

interface VapiCallResponse {
  id: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify the user's JWT and get their user ID
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Use service role to check if user has admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: hasAdminRole, error: roleError } = await serviceClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // User is authenticated and has admin role - proceed
    const { founderIds }: SendWhatsAppRequest = await req.json();

    if (!founderIds || !Array.isArray(founderIds) || founderIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "founderIds array is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    const vapiAssistantId = Deno.env.get("VAPI_ASSISTANT_ID");
    const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID");

    if (!vapiApiKey || !vapiAssistantId || !vapiPhoneNumberId) {
      console.error("Missing Vapi configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Fetch the founder profiles
    const { data: founders, error: fetchError } = await serviceClient
      .from("founder_profiles")
      .select("id, whatsapp, phone_number")
      .in("id", founderIds);

    if (fetchError) {
      console.error("Error fetching founders:", fetchError);
      throw fetchError;
    }

    if (!founders || founders.length === 0) {
      return new Response(
        JSON.stringify({ error: "No founders found with the provided IDs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const results: { founderId: string; success: boolean; callId?: string; error?: string }[] = [];

    for (const founder of founders) {
      const phoneNumber = founder.whatsapp || founder.phone_number;
      
      if (!phoneNumber) {
        results.push({
          founderId: founder.id,
          success: false,
          error: "No phone number available"
        });
        continue;
      }

      try {
        console.log(`Initiating WhatsApp call to ${phoneNumber} for founder ${founder.id}`);
        
        const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: vapiAssistantId,
            phoneNumberId: vapiPhoneNumberId,
            customer: {
              number: phoneNumber,
            },
          }),
        });

        if (!vapiResponse.ok) {
          const errorText = await vapiResponse.text();
          console.error(`Vapi API error for founder ${founder.id}:`, errorText);
          results.push({
            founderId: founder.id,
            success: false,
            error: `Vapi API error: ${vapiResponse.status}`
          });
          continue;
        }

        const vapiData: VapiCallResponse = await vapiResponse.json();
        console.log(`Successfully initiated call ${vapiData.id} for founder ${founder.id}`);

        // Update the founder's status to 'contacted'
        await serviceClient
          .from("founder_profiles")
          .update({ status: 'contacted' })
          .eq("id", founder.id);

        results.push({
          founderId: founder.id,
          success: true,
          callId: vapiData.id
        });
      } catch (callError) {
        console.error(`Error calling founder ${founder.id}:`, callError);
        results.push({
          founderId: founder.id,
          success: false,
          error: callError instanceof Error ? callError.message : "Unknown error"
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-whatsapp-intro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
