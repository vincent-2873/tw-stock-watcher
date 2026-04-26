-- ============================================================================
-- Migration 0018 DOWN: 回滾 Data Quality Status + Basis Accuracy 防線欄位
--
-- 用法:
--   只在需要完全回滾 T3a 防線時執行。
--   注意:這會同時刪除已標記的 data_quality_status 值跟 basis_accuracy_pct,
--   要 archive 還是純刪除請在執行前先 SELECT 備份。
--
-- 套用方式:
--   POST /api/admin/exec_sql 或 Supabase Studio
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_qp_data_quality_status;
DROP INDEX IF EXISTS idx_qp_source;
ALTER TABLE quack_predictions
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS data_quality_status,
  DROP COLUMN IF EXISTS basis_accuracy_pct,
  DROP COLUMN IF EXISTS basis_quality;

DROP INDEX IF EXISTS idx_qj_data_quality_status;
DROP INDEX IF EXISTS idx_qj_source;
ALTER TABLE quack_judgments
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS data_quality_status,
  DROP COLUMN IF EXISTS basis_accuracy_pct,
  DROP COLUMN IF EXISTS basis_quality;

COMMIT;
