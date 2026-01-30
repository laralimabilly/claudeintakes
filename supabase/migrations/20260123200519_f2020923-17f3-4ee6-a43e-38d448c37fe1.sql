-- Delete founder profiles with null phone numbers (incomplete records)
DELETE FROM founder_profiles WHERE phone_number IS NULL;

-- Add NOT NULL constraint to phone_number column
ALTER TABLE founder_profiles ALTER COLUMN phone_number SET NOT NULL;