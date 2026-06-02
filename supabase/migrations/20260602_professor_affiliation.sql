-- Track historical affiliation changes for professors so generate-professor can
-- auto-correct the canonical row when an official staff page confirms a move
-- (e.g., Lemuria Carter moved UNSW -> USYD), without losing the prior record.
ALTER TABLE professors
  ADD COLUMN IF NOT EXISTS previous_affiliation text,
  ADD COLUMN IF NOT EXISTS affiliation_updated_at timestamptz;
