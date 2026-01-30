-- Create founder_profiles table to store Vapi call interview data
CREATE TABLE IF NOT EXISTS public.founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  vapi_call_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  whatsapp TEXT,
  idea_description TEXT,
  problem_solving TEXT,
  target_customer TEXT,
  stage TEXT,
  excitement_reason TEXT,
  background TEXT,
  core_skills TEXT[],
  previous_founder BOOLEAN,
  superpower TEXT,
  weaknesses_blindspots TEXT[],
  timeline_start TEXT,
  urgency_level TEXT,
  seeking_skills TEXT[],
  cofounder_type TEXT,
  location_preference TEXT,
  commitment_level TEXT,
  working_style TEXT,
  non_negotiables TEXT[],
  deal_breakers TEXT[],
  equity_thoughts TEXT,
  seriousness_score INTEGER,
  preferred_contact TEXT,
  match_frequency_preference TEXT,
  success_criteria TEXT,
  willingness_to_pay TEXT,
  call_summary TEXT,
  matched BOOLEAN DEFAULT false NOT NULL,
  match_sent_at TIMESTAMP WITH TIME ZONE
);

-- Create index on vapi_call_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_founder_profiles_vapi_call_id ON public.founder_profiles(vapi_call_id);

-- Create index on phone_number for potential user lookups
CREATE INDEX IF NOT EXISTS idx_founder_profiles_phone_number ON public.founder_profiles(phone_number);

-- Enable Row Level Security
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for backend operations and Vapi webhooks)
CREATE POLICY "Service role has full access to founder_profiles"
ON public.founder_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can view all profiles (for matching purposes)
-- Note: Adjust this policy based on your specific access requirements
CREATE POLICY "Authenticated users can view founder_profiles"
ON public.founder_profiles
FOR SELECT
TO authenticated
USING (true);