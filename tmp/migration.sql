-- ============================================================================
-- Migration: Create system_parameters table
-- Store runtime-configurable system parameters as JSON
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_parameters (
  system_key   TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_parameters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (admin check done at app level)
CREATE POLICY "Allow authenticated read" ON system_parameters
  FOR SELECT TO authenticated USING (true);

-- Only allow updates via service role (edge functions)
CREATE POLICY "Service role full access" ON system_parameters
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Seed: MATCHING_WEIGHTS
-- ============================================================================

INSERT INTO system_parameters (system_key, value, description)
VALUES (
  'MATCHING_WEIGHTS',
  '{
    "min_match_score": 60,
    "highly_compatible_threshold": 75,
    "dimensions": {
      "skills": {
        "weight": 0.30,
        "label": "Skills Complementarity",
        "sub_weights": {
          "coverage": 0.70,
          "superpower_boost": 0.20,
          "semantic_boost": 0.10
        },
        "overlap_penalty_factor": 0.30
      },
      "stage": {
        "weight": 0.20,
        "label": "Stage & Timeline",
        "stage_matrix": {
          "idea":     { "idea": 100, "mvp": 80, "launched": 50, "scaling": 30 },
          "mvp":      { "idea": 80,  "mvp": 100, "launched": 80, "scaling": 50 },
          "launched": { "idea": 50,  "mvp": 80, "launched": 100, "scaling": 80 },
          "scaling":  { "idea": 30,  "mvp": 50, "launched": 80, "scaling": 100 }
        },
        "urgency_matrix": {
          "asap":     { "asap": 100, "soon": 80, "flexible": 50 },
          "soon":     { "asap": 80,  "soon": 100, "flexible": 80 },
          "flexible": { "asap": 50,  "soon": 80, "flexible": 100 }
        },
        "commitment_scores": {
          "same": 100,
          "one_fulltime_one_not": 50,
          "different_compatible": 75,
          "unknown": 70
        }
      },
      "communication": {
        "weight": 0.18,
        "label": "Communication Style",
        "sub_weights": {
          "directness": 0.40,
          "structure": 0.35,
          "collaboration": 0.25
        },
        "spectrum_scores": {
          "high":     { "high": 100, "mid-high": 85, "neutral": 65, "mid-low": 45, "low": 30 },
          "mid-high": { "high": 85,  "mid-high": 100, "neutral": 80, "mid-low": 60, "low": 40 },
          "neutral":  { "high": 65,  "mid-high": 80, "neutral": 75, "mid-low": 80, "low": 65 },
          "mid-low":  { "high": 45,  "mid-high": 60, "neutral": 80, "mid-low": 100, "low": 85 },
          "low":      { "high": 30,  "mid-high": 40, "neutral": 65, "mid-low": 85, "low": 100 }
        }
      },
      "values": {
        "weight": 0.15,
        "label": "Working Values",
        "sub_weights": {
          "pace": 0.25,
          "risk": 0.20,
          "equity": 0.20,
          "decision": 0.15,
          "autonomy": 0.10,
          "worklife": 0.10
        },
        "dimension_scores": {
          "same": 100,
          "adjacent": 75,
          "opposite": 40,
          "unknown": 60
        },
        "equity_compatibility": {
          "same": 100,
          "flexible_any": 85,
          "equal_contribution": 65,
          "equal_majority": 30,
          "default": 50
        }
      },
      "vision": {
        "weight": 0.12,
        "label": "Vision Alignment",
        "sub_weights": {
          "industry": 0.45,
          "segment": 0.30,
          "semantic": 0.15,
          "vocabulary": 0.10
        },
        "industry_scores": {
          "overlap_base": 0.70,
          "overlap_bonus": 0.30,
          "no_overlap": 0.20,
          "one_unknown": 0.50,
          "both_unknown": 0.50
        },
        "segment_scores": {
          "overlap_base": 0.75,
          "overlap_bonus": 0.25,
          "no_overlap": 0.30,
          "unknown": 0.50
        }
      },
      "geo": {
        "weight": 0.03,
        "label": "Geographic Fit",
        "distance_scores": {
          "50": 100,
          "200": 90,
          "500": 80,
          "2000": 70,
          "5000": 60,
          "10000": 50,
          "beyond": 40
        },
        "timezone_modifiers": {
          "good_hours": 3,
          "good_bonus": 10,
          "moderate_hours": 6,
          "moderate_bonus": 0,
          "poor_penalty": -10
        },
        "fallback_scores": {
          "both_remote_only": 75,
          "both_remote_ok": 70,
          "one_relocate": 65,
          "one_remote_ok": 50,
          "no_data": 50,
          "no_flexibility": 30
        },
        "relocate_bonus": 5
      },
      "advantages": {
        "weight": 0.02,
        "label": "Advantage Synergy",
        "synergy_scores": {
          "zero_overlap": 80,
          "one_overlap": 65,
          "high_overlap": 50,
          "one_has": 60,
          "neither_has": 50
        }
      }
    }
  }'::jsonb,
  'Matching algorithm weights and scoring parameters for the 7-dimension co-founder matching system'
)
ON CONFLICT (system_key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
