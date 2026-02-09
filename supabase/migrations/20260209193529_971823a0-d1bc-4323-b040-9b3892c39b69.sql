
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'IDLE',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active conversation per founder
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_founder_id 
  ON public.whatsapp_conversations(founder_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone 
  ON public.whatsapp_conversations(phone_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_state 
  ON public.whatsapp_conversations(current_state) 
  WHERE current_state != 'IDLE';

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message 
  ON public.whatsapp_conversations(last_message_at) 
  WHERE current_state != 'IDLE';

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to whatsapp_conversations"
  ON public.whatsapp_conversations
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Admins/service role can do everything
CREATE POLICY "Admins can manage whatsapp_conversations"
  ON public.whatsapp_conversations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Valid state constraint
ALTER TABLE public.whatsapp_conversations
  ADD CONSTRAINT valid_conversation_state 
  CHECK (current_state IN (
    'IDLE',
    'MATCH_NOTIFIED',
    'MATCH_DETAILS_SENT',
    'INTRO_CONFIRMED',
    'WAITING_FOR_OTHER',
    'DECLINE_FEEDBACK',
    'INTRO_SENT',
    'FOLLOWUP_PENDING'
  ));

-- Verify founder_matches schema compatibility
DO $$ 
BEGIN
  RAISE NOTICE 'founder_matches schema is already compatible with the WhatsApp flow';
END $$;
