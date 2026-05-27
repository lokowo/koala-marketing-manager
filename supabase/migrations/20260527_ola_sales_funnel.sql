-- Add sales funnel tracking columns to ola_user_memory
ALTER TABLE ola_user_memory
  ADD COLUMN IF NOT EXISTS sales_stage text NOT NULL DEFAULT 'warmup',
  ADD COLUMN IF NOT EXISTS total_turns integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS pain_points text[];
