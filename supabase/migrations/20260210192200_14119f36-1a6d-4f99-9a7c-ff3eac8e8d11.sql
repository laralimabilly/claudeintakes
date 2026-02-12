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
        }
      },
      "values": {
        "weight": 0.15,
        "label": "Values Alignment",
        "sub_weights": {
          "equity": 0.35,
          "success": 0.35,
          "non_negotiables": 0.30
        }
      },
      "vision": {
        "weight": 0.10,
        "label": "Vision Alignment",
        "sub_weights": {
          "market": 0.50,
          "problem": 0.50
        }
      },
      "geo": {
        "weight": 0.07,
        "label": "Location Compatibility"
      }
    }
  }'::jsonb,
  'Weights and thresholds for the founder matching algorithm'
)
ON CONFLICT (system_key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ============================================================================
-- Seed: WHATSAPP_CONFIG
-- ============================================================================

INSERT INTO system_parameters (system_key, value, description)
VALUES (
  'WHATSAPP_CONFIG',
  '{
    "match_notification": {
      "auto_send": false,
      "delay_seconds": 0,
      "max_retries": 2
    },
    "conversation": {
      "idle_timeout_hours": 72,
      "followup_delay_hours": 24,
      "max_followups": 2
    },
    "templates": {
      "match_notify": "whatsapp_match_notification",
      "intro_message": "whatsapp_intro_message"
    }
  }'::jsonb,
  'WhatsApp messaging configuration and templates'
)
ON CONFLICT (system_key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();