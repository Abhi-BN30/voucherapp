-- Voucher App: Phase 1 + Phase 2 DB changes
-- Run this in Neon after your existing schema.

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_voucher_deleted_by'
  ) THEN
    ALTER TABLE vouchers
      ADD CONSTRAINT fk_voucher_deleted_by
      FOREIGN KEY (deleted_by) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vouchers_active_user_date
  ON vouchers(created_by, voucher_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_deleted_user_date
  ON vouchers(created_by, deleted_at, voucher_date DESC);

CREATE TABLE IF NOT EXISTS payees (
    payee_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payee_name TEXT NOT NULL,
    CONSTRAINT payee_name_not_empty CHECK (length(trim(payee_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payees_name_unique
  ON payees (LOWER(BTRIM(payee_name)));
