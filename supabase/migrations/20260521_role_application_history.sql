-- Migration: create role_application_history
-- Audit trail for role application lifecycle (submit/approve/reject/resubmit/withdraw)
-- Writes only via service_role; no INSERT/UPDATE/DELETE policies for anon/authenticated

CREATE TABLE role_application_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES role_applications(id) ON DELETE CASCADE,
  action          text NOT NULL CHECK (action IN ('submitted','approved','rejected','resubmitted','withdrawn')),
  actor_id        uuid NOT NULL REFERENCES auth.users(id),
  actor_role      text NOT NULL CHECK (actor_role IN ('user','admin','super_admin')),
  reason          text,
  snapshot        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rah_application_id ON role_application_history(application_id);
CREATE INDEX idx_rah_created_at     ON role_application_history(created_at DESC);

ALTER TABLE role_application_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all history"
  ON role_application_history FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin','super_admin')
    )
  );

CREATE POLICY "Users read own application history"
  ON role_application_history FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM role_applications
      WHERE role_applications.id = role_application_history.application_id
        AND role_applications.user_id = auth.uid()
    )
  );
