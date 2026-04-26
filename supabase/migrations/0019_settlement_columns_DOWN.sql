-- ============================================================================
-- Migration 0019 DOWN
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_qp_pending_settle;
ALTER TABLE quack_predictions
  DROP COLUMN IF EXISTS settle_method;

DROP INDEX IF EXISTS idx_qj_pending_settle;
ALTER TABLE quack_judgments
  DROP COLUMN IF EXISTS settled_at,
  DROP COLUMN IF EXISTS settled_close,
  DROP COLUMN IF EXISTS hit_or_miss,
  DROP COLUMN IF EXISTS settle_method;

COMMIT;
