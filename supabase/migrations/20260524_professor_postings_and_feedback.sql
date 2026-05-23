-- Add claimed_by to professors (missing from prior migration)
ALTER TABLE professors
  ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_professors_claimed_by ON professors(claimed_by) WHERE claimed_by IS NOT NULL;

-- Professor job postings
CREATE TABLE IF NOT EXISTS professor_postings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id uuid NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  deadline date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professor_postings_professor_id ON professor_postings(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_postings_status ON professor_postings(status);

ALTER TABLE professor_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage own postings"
  ON professor_postings FOR ALL
  USING (
    professor_id IN (
      SELECT id FROM professors WHERE claimed_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active postings"
  ON professor_postings FOR SELECT
  USING (status = 'active');

-- Professor feedback on student recommendations
CREATE TABLE IF NOT EXISTS professor_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id uuid NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('interested', 'not_suitable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professor_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_professor_feedback_professor_id ON professor_feedback(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_feedback_action ON professor_feedback(action);

ALTER TABLE professor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage own feedback"
  ON professor_feedback FOR ALL
  USING (
    professor_id IN (
      SELECT id FROM professors WHERE claimed_by = auth.uid()
    )
  );
