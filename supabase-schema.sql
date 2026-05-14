-- Hearth: Plant Tracker Schema
-- Run this in the Supabase SQL editor

-- ============================================================
-- Table: houseplants (reference data, ~500 rows)
-- ============================================================
CREATE TABLE IF NOT EXISTS houseplants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name text NOT NULL,
  scientific_name text NOT NULL,
  description text NOT NULL,
  water_frequency_days integer NOT NULL,
  water_tip text NOT NULL,
  sunlight text NOT NULL,
  environment text NOT NULL,
  seasonal_adjustment jsonb DEFAULT '{"winter_multiplier": 1.5}'::jsonb
);

-- GIN index for fast typeahead search
CREATE INDEX IF NOT EXISTS idx_houseplants_search
  ON houseplants USING gin (
    (lower(common_name) || ' ' || lower(scientific_name)) gin_trgm_ops
  );

-- Fallback B-tree indexes if pg_trgm is not available
CREATE INDEX IF NOT EXISTS idx_houseplants_common_name ON houseplants (lower(common_name));
CREATE INDEX IF NOT EXISTS idx_houseplants_scientific_name ON houseplants (lower(scientific_name));

-- ============================================================
-- Table: user_plants (user's tracked plants)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  houseplant_id uuid REFERENCES houseplants(id) ON DELETE SET NULL,
  nickname text,
  custom_name text, -- for freeform entries without a houseplant reference
  location text NOT NULL DEFAULT 'Living room',
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Table: watering_log (watering history)
-- ============================================================
CREATE TABLE IF NOT EXISTS watering_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plant_id uuid NOT NULL REFERENCES user_plants(id) ON DELETE CASCADE,
  watered_at timestamptz NOT NULL DEFAULT now(),
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watering_log_plant ON watering_log (user_plant_id, watered_at DESC);

-- ============================================================
-- RLS Policies (open access, same as existing tables)
-- ============================================================
ALTER TABLE houseplants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations (app uses password gate, not Supabase auth)
CREATE POLICY "Allow all on houseplants" ON houseplants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_plants" ON user_plants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on watering_log" ON watering_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime (enable for user-facing tables)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_plants;
ALTER PUBLICATION supabase_realtime ADD TABLE watering_log;

-- ============================================================
-- Storage bucket for plant photos
-- ============================================================
-- Run in Supabase Dashboard > Storage > Create bucket:
--   Name: plant-photos
--   Public: true
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   File size limit: 5MB
--
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plant-photos', 'plant-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow all (password-gated app)
CREATE POLICY "Allow all uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'plant-photos');
CREATE POLICY "Allow all reads" ON storage.objects FOR SELECT USING (bucket_id = 'plant-photos');
CREATE POLICY "Allow all updates" ON storage.objects FOR UPDATE USING (bucket_id = 'plant-photos');
CREATE POLICY "Allow all deletes" ON storage.objects FOR DELETE USING (bucket_id = 'plant-photos');

-- ============================================================
-- Phase 2: Recurring Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cadence_type text NOT NULL CHECK (cadence_type IN ('daily','weekly','interval')),
  interval_days int,
  days_of_week int[],
  who text DEFAULT 'Jay',
  notes text,
  last_completed_at timestamptz,
  next_due_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_task_id uuid NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on recurring_tasks" ON recurring_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recurring_completions" ON recurring_completions FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE recurring_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_completions;
