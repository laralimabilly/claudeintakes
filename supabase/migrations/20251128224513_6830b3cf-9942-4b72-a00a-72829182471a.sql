-- Add notes_updated_at column to track when admin notes are modified
ALTER TABLE public.founder_profiles 
ADD COLUMN notes_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient filtering/sorting by notes update time
CREATE INDEX idx_founder_profiles_notes_updated_at ON public.founder_profiles(notes_updated_at);

-- Create trigger to auto-update notes_updated_at when admin_notes changes
CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    NEW.notes_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notes_timestamp
BEFORE UPDATE ON public.founder_profiles
FOR EACH ROW
EXECUTE FUNCTION update_notes_timestamp();