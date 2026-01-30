-- Add the is_from_user column to track who sent the message
ALTER TABLE public.whatsapp_messages 
ADD COLUMN is_from_user BOOLEAN DEFAULT true;

-- Create index for faster conversation retrieval
CREATE INDEX idx_whatsapp_messages_phone_created 
ON public.whatsapp_messages(phone_number, created_at DESC);