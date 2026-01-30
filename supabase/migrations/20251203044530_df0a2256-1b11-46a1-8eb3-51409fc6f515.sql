-- Create table for storing incoming WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message_content TEXT,
  twilio_message_sid TEXT UNIQUE,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Restrict access to service role only (deny-all policies)
CREATE POLICY "Restrict read to service role only"
ON public.whatsapp_messages
FOR SELECT
USING (false);

CREATE POLICY "Restrict insert to service role only"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Restrict update to service role only"
ON public.whatsapp_messages
FOR UPDATE
USING (false);

CREATE POLICY "Restrict delete to service role only"
ON public.whatsapp_messages
FOR DELETE
USING (false);

-- Index for lookups
CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_processed ON public.whatsapp_messages(processed);