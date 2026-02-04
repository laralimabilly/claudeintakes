// supabase/functions/backfill-geocoding/index.ts
// ============================================================================
// Backfill geocoding for existing founder profiles
//
// Creates records in founder_locations table for profiles that have
// location_preference but no corresponding location record.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geocodeLocation } from '../_shared/geocoding/geocodeLocation.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nominatim rate limit: 1 request/second
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { batchSize = 50, delayMs = 1100 } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: hasAdminRole } = await serviceClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Admin role required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Find profiles without location records
    console.log("Finding profiles without location records...");
    
    const { data: profiles, error: fetchError } = await serviceClient
      .from("founder_profiles")
      .select(`
        id,
        location_preference,
        location:founder_locations(id)
      `)
      .not("location_preference", "is", null)
      .limit(batchSize * 2); // Fetch extra since some will already have locations

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    // Filter to only those without location records
    const profilesNeedingGeocode = (profiles || [])
      .filter(p => !p.location || (Array.isArray(p.location) && p.location.length === 0))
      .slice(0, batchSize);

    if (profilesNeedingGeocode.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All profiles have location records",
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${profilesNeedingGeocode.length} profiles...`);

    const results = {
      geocoded: 0,
      preferencesOnly: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const profile of profilesNeedingGeocode) {
      try {
        const geoResult = await geocodeLocation(profile.location_preference);

        const locationData: Record<string, unknown> = {
          founder_id: profile.id,
          raw_input: profile.location_preference,
          is_remote_ok: geoResult.preferences.isRemoteOk,
          is_remote_only: geoResult.preferences.isRemoteOnly,
          is_hybrid_ok: geoResult.preferences.isHybridOk,
          willing_to_relocate: geoResult.preferences.willingToRelocate,
        };

        if (geoResult.success && geoResult.location) {
          const loc = geoResult.location;
          locationData.lat = loc.lat;
          locationData.lng = loc.lng;
          locationData.city = loc.city;
          locationData.region = loc.region;
          locationData.country = loc.country;
          locationData.country_name = loc.countryName;
          locationData.display_name = loc.displayName;
          locationData.timezone_offset = loc.timezoneOffset;
          locationData.confidence = loc.confidence;
          locationData.geocoded_at = new Date().toISOString();

          results.geocoded++;
          console.log(`✓ ${profile.id}: "${profile.location_preference}" → ${loc.city}, ${loc.country}`);
        } else {
          results.preferencesOnly++;
          console.log(`○ ${profile.id}: Preferences only for "${profile.location_preference}"`);
        }

        const { error: insertError } = await serviceClient
          .from("founder_locations")
          .insert(locationData);

        if (insertError) {
          // Might be duplicate - try upsert
          const { error: upsertError } = await serviceClient
            .from("founder_locations")
            .upsert(locationData, { onConflict: 'founder_id' });
          
          if (upsertError) {
            throw new Error(`Insert/upsert failed: ${upsertError.message}`);
          }
        }

        await delay(delayMs);

      } catch (error) {
        results.failed++;
        const errorMsg = `Failed ${profile.id}: ${error instanceof Error ? error.message : 'Unknown'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
        await delay(delayMs);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        geocoded: results.geocoded,
        preferencesOnly: results.preferencesOnly,
        failed: results.failed,
        total: profilesNeedingGeocode.length,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in backfill-geocoding:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
