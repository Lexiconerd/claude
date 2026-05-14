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

-- ============================================================
-- Fitness Log
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  sets integer,
  reps integer,
  weight numeric,
  unit text DEFAULT 'lbs',
  note text,
  next_session text CHECK (next_session IN ('much_higher','higher','equal','lower','much_lower')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('lower_body','core','upper_body')),
  default_sets integer,
  default_reps integer,
  notes text
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on workout_sessions" ON workout_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on workout_entries" ON workout_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exercise_library" ON exercise_library FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE workout_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE exercise_library;

-- Seed exercise library
INSERT INTO exercise_library (name, category, default_sets, default_reps) VALUES
  ('Barbell Hip Thrust',              'lower_body', 3, 10),
  ('Bulgarian Split Squat',           'lower_body', 3, 8),
  ('Single-leg Romanian Deadlift',    'lower_body', 3, 8),
  ('Lying Leg Curl',                  'lower_body', 3, 10),
  ('Eccentric Step-downs',            'lower_body', 3, 8),
  ('Single-leg Calf Raises',          'lower_body', 3, 10),
  ('Cable Row',                       'upper_body', 3, 8),
  ('Overhead Press',                  'upper_body', 3, 10),
  ('Copenhagen Plank',                'core',       3, 20),
  ('Dead Bug',                        'core',       3, 12)
ON CONFLICT DO NOTHING;

-- Data migration: May 13 2026 session
INSERT INTO workout_sessions (id, session_date)
VALUES ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', '2026-05-13')
ON CONFLICT DO NOTHING;

INSERT INTO workout_entries (session_id, exercise, sets, reps, weight, unit, next_session, note) VALUES
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Barbell Hip Thrust',           3, 10, 45,   'lbs', 'higher',    NULL),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Bulgarian Split Squat',        3, 8,  20,   'lbs', 'equal',     NULL),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Single-leg Romanian Deadlift', 2, 8,  30,   'lbs', 'lower',     'only 2 sets'),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Lying Leg Curl',               3, 10, 45,   'lbs', 'equal',     NULL),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Eccentric Step-downs',         3, 8,  NULL, 'lbs', 'equal',     '12 inch box, bodyweight'),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Single-leg Calf Raises',       2, 10, 55,   'lbs', 'lower',     'only 2 sets'),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Cable Row',                    3, 8,  55,   'lbs', 'equal',     NULL),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Overhead Press',               3, 10, 40,   'lbs', 'equal',     '40 lbs total / 20 lbs per hand'),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Copenhagen Plank',             2, 20, NULL, 'lbs', 'equal',     '20 sec each side, ran out of time'),
  ('b7e3f2a1-4c8d-4e9b-a012-3f5678901234', 'Dead Bug',                     3, 12, NULL, 'lbs', 'equal',     NULL)
ON CONFLICT DO NOTHING;
