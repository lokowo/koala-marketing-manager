-- Add unique constraint for KPI targets upsert
-- Required by the API's onConflict: 'agent_id,effective_from'
ALTER TABLE sales_kpi_targets
  ADD CONSTRAINT uq_kpi_targets_agent_period UNIQUE (agent_id, effective_from);
