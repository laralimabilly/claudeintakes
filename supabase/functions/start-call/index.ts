import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartCallRequest {
  phoneNumber: string;
}

interface VapiCallResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

// Rate limit configuration
const IP_RATE_LIMIT = 5; // Max 5 calls per IP per hour
const RATE_LIMIT_WINDOW_MINUTES = 60;

async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  
  // Count recent requests for this key
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return { allowed: true, remaining: 0 };
  }

  const currentCount = count || 0;
  const allowed = currentCount < limit;
  
  return { 
    allowed, 
    remaining: Math.max(0, limit - currentCount - (allowed ? 1 : 0))
  };
}

async function recordRateLimitHit(
  supabase: SupabaseClient,
  key: string
): Promise<void> {
  const { error } = await supabase
    .from('rate_limits')
    .insert([{ key }]);
  
  if (error) {
    console.error('Failed to record rate limit hit:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Configuration error: Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check IP-based rate limit first (before parsing body)
    const ipRateLimitKey = `ip:${clientIP}`;
    const ipRateLimit = await checkRateLimit(supabase, ipRateLimitKey, IP_RATE_LIMIT);
    
    if (!ipRateLimit.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(RATE_LIMIT_WINDOW_MINUTES * 60)
          },
        }
      );
    }

    // Parse request body
    const { phoneNumber }: StartCallRequest = await req.json();

    // Validate phone number
    if (!phoneNumber) {
      console.error("Validation error: Phone number is required");
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length < 10) {
      console.error("Validation error: Phone number must be at least 10 digits long");
      return new Response(
        JSON.stringify({ error: "Phone number must be at least 10 digits long" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this phone number already has a profile with meaningful data
    const { data: existingProfile } = await supabase
      .from('founder_profiles')
      .select('id, name, status')
      .eq('phone_number', phoneNumber)
      .not('name', 'is', null)
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      console.log(`Phone number already registered: ${digitsOnly.slice(-4)}, profile: ${existingProfile.id}`);
      return new Response(
        JSON.stringify({ 
          error: "This phone number is already registered in our system. We'll be in touch soon!",
          alreadyRegistered: true
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get API credentials from environment
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');

    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
      console.error("Configuration error: Missing VAPI_API_KEY, VAPI_ASSISTANT_ID, or VAPI_PHONE_NUMBER_ID");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Initiating call to: ${phoneNumber} from IP: ${clientIP}`);

    // Call Vapi API to initiate outbound call
    const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phoneNumber,
        },
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error(`Vapi API error (${vapiResponse.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to initiate call",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Record IP rate limit hit
    await recordRateLimitHit(supabase, ipRateLimitKey);

    const callData: VapiCallResponse = await vapiResponse.json();
    console.log("Call initiated successfully:", callData.id);

    // Pre-create founder profile with phone number to ensure it's never null
    // The vapi-webhook will upsert and merge with this record
    const { error: profileError } = await supabase
      .from('founder_profiles')
      .upsert({
        vapi_call_id: callData.id,
        phone_number: phoneNumber,
        matched: false,
        status: 'new'
      }, {
        onConflict: 'phone_number',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error("Warning: Failed to pre-create founder profile:", profileError);
      // Don't fail the call - the webhook will still try to create/update the profile
    } else {
      console.log("Pre-created founder profile with phone number for call:", callData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        callId: callData.id,
        status: callData.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error in start-call function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
