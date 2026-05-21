-- Add payout reference fields to sales_commissions
-- Prepares for Phase 3 Bug #21: transfer receipt/proof storage

ALTER TABLE sales_commissions
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_note text;

ALTER TABLE sales_commissions
  ADD CONSTRAINT chk_payout_method
  CHECK (payout_method IS NULL OR payout_method IN ('bank_transfer', 'wechat', 'alipay', 'other'));

CREATE INDEX IF NOT EXISTS idx_sales_commissions_paid_out_at
  ON sales_commissions (paid_out_at)
  WHERE paid_out_at IS NOT NULL;
