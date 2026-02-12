// supabase/functions/compute-matches/index.ts
// Edge Function to compute matches for a founder
// Now reads matching config from system_parameters table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateMatchScore } from '../_shared/matching/calculateMatch.ts'
import { checkDealbreakers } from '../_shared/matching/dealbreakers.ts'
import type { MatchingConfig } from '../_shared/matching/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Load matching config from system_parameters table.
 * Throws if not found — if DB is down, nothing else works either.
 */
async function loadMatchingConfig(supabase: any): Promise<MatchingConfig> {
  const { data, error } = await supabase
    .from('system_parameters')
    .select('value')
    .eq('system_key', 'MATCHING_WEIGHTS')
    .single();

  if (error || !data) {
    throw new Error(`Failed to load MATCHING_WEIGHTS from system_parameters: ${error?.message ?? 'not found'}`);
  }

  console.log('[compute-matches] Loaded MATCHING_WEIGHTS from system_parameters');
  return data.value as MatchingConfig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { founder_id } = await req.json()

    if (!founder_id) {
      throw new Error('founder_id is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Load matching config from DB
    const config = await loadMatchingConfig(supabase);

    console.log(`Computing matches for founder: ${founder_id} (min_score=${config.min_match_score}, high_compat=${config.highly_compatible_threshold})`)

    // 1. Get the founder's profile with location data
    const { data: newFounder, error: founderError } = await supabase
      .from('founder_profiles')
      .select(`
        *,
        location:founder_locations(
          lat, lng, city, country, timezone_offset,
          is_remote_ok, is_remote_only, is_hybrid_ok, willing_to_relocate
        )
      `)
      .eq('id', founder_id)
      .single()

    if (founderError || !newFounder) {
      throw new Error(`Founder not found: ${founderError?.message}`)
    }

    // 2. Get all other founders with location data
    const { data: existingFounders, error: foundersError } = await supabase
      .from('founder_profiles')
      .select(`
        *,
        location:founder_locations(
          lat, lng, city, country, timezone_offset,
          is_remote_ok, is_remote_only, is_hybrid_ok, willing_to_relocate
        )
      `)
      .neq('id', founder_id)

    if (foundersError) {
      throw new Error(`Error fetching founders: ${foundersError.message}`)
    }

    console.log(`Found ${existingFounders?.length || 0} potential matches to check`)

    const matches: Array<{
      founder_id: string;
      matched_founder_id: string;
      total_score: number;
      compatibility_level: string;
      score_skills: number;
      score_stage: number;
      score_communication: number;
      score_vision: number;
      score_values: number;
      score_geo: number;
      score_advantages: number;
      status: string;
    }> = []
    let dealbreakersFiltered = 0

    // 3. Check each potential match
    for (const existingFounder of existingFounders || []) {
      const passesNewFounderDealbreakers = checkDealbreakers(newFounder, existingFounder)
      const passesExistingFounderDealbreakers = checkDealbreakers(existingFounder, newFounder)

      if (!passesNewFounderDealbreakers || !passesExistingFounderDealbreakers) {
        dealbreakersFiltered++
        continue
      }

      // Pass config to calculateMatchScore
      const matchResult = calculateMatchScore(newFounder, existingFounder, config)

      if (matchResult && matchResult.total_score >= config.min_match_score) {
        matches.push({
          founder_id: matchResult.founder_a_id,
          matched_founder_id: matchResult.founder_b_id,
          total_score: matchResult.total_score,
          compatibility_level: matchResult.compatibility_level,
          score_skills: matchResult.dimension_scores.skills,
          score_stage: matchResult.dimension_scores.stage,
          score_communication: matchResult.dimension_scores.communication,
          score_vision: matchResult.dimension_scores.vision,
          score_values: matchResult.dimension_scores.values,
          score_geo: matchResult.dimension_scores.geo,
          score_advantages: matchResult.dimension_scores.advantages,
          status: 'pending'
        })
      }
    }

    console.log(`Filtered ${dealbreakersFiltered} by dealbreakers, found ${matches.length} compatible matches`)

    // 4. Bulk insert/update matches
    if (matches.length > 0) {
      const { error: insertError } = await supabase
        .from('founder_matches')
        .upsert(matches, { 
          onConflict: 'founder_id,matched_founder_id',
          ignoreDuplicates: false 
        })

      if (insertError) {
        throw new Error(`Error saving matches: ${insertError.message}`)
      }

      console.log(`Successfully saved ${matches.length} matches`)
    }

    // 5. Return summary
    const response = {
      success: true,
      founder_id,
      config_used: {
        min_match_score: config.min_match_score,
        highly_compatible_threshold: config.highly_compatible_threshold,
        weights: Object.fromEntries(
          Object.entries(config.dimensions).map(([k, v]) => [k, (v as any).weight])
        ),
      },
      total_checked: existingFounders?.length || 0,
      dealbreakers_filtered: dealbreakersFiltered,
      total_matches: matches.length,
      highly_compatible: matches.filter(m => m.total_score >= config.highly_compatible_threshold).length,
      somewhat_compatible: matches.filter(m => m.total_score >= config.min_match_score && m.total_score < config.highly_compatible_threshold).length,
      top_matches: matches
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 5)
        .map(m => ({
          matched_founder_id: m.matched_founder_id,
          total_score: m.total_score,
          compatibility_level: m.compatibility_level
        }))
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error computing matches:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
