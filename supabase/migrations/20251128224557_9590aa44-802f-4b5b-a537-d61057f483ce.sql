-- Fix search_path security warning for update_notes_timestamp function
CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    NEW.notes_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;