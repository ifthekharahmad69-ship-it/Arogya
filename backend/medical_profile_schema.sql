-- Medical Profile Table (per-user, private, row-level secure)
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_medical_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               TEXT NOT NULL UNIQUE,          -- Clerk user ID
  full_name             TEXT,
  age                   INTEGER,
  date_of_birth         DATE,
  gender                TEXT,
  blood_group           TEXT,                           -- A+, O-, etc.
  height_cm             INTEGER,
  weight_kg             DECIMAL(5,2),

  -- Medical Conditions (stored as JSON array)
  conditions            JSONB DEFAULT '[]',             -- ["Diabetes","Hypertension"]

  -- Vitals
  bp_systolic           INTEGER,                        -- e.g. 130
  bp_diastolic          INTEGER,                        -- e.g. 85
  sugar_level_fasting   DECIMAL(6,2),                  -- mg/dL
  sugar_level_pp        DECIMAL(6,2),                  -- post-prandial
  pulse_rate            INTEGER,

  -- Medications & Allergies
  current_medications   JSONB DEFAULT '[]',             -- ["Metformin 500mg","Amlodipine"]
  allergies             JSONB DEFAULT '[]',             -- ["Penicillin","Shellfish"]

  -- Preferred Hospitals
  preferred_hospitals   JSONB DEFAULT '[]',             -- ["Apollo","AIIMS","Fortis"]

  -- Emergency Contact
  emergency_contact_name    TEXT,
  emergency_contact_phone   TEXT,
  emergency_contact_relation TEXT,

  -- Insurance
  has_insurance         BOOLEAN DEFAULT false,
  insurance_provider    TEXT,
  policy_number         TEXT,

  -- Organ Donor
  organ_donor           BOOLEAN DEFAULT false,

  -- Special notes for doctors
  doctor_notes          TEXT,

  -- Timestamps
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security: users can only read/write their OWN profile
ALTER TABLE user_medical_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: user can select their own row (using Clerk user_id passed as header)
-- Note: In practice, the backend validates the Clerk JWT and passes user_id server-side

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_medical_profiles_user_id ON user_medical_profiles(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_medical_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_medical_profile_updated
  BEFORE UPDATE ON user_medical_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_profile_timestamp();
