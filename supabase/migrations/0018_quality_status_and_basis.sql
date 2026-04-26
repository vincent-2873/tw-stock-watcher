-- ============================================================================
-- Migration 0018: Data Quality Status + Basis Accuracy 防線欄位
--
-- 為什麼:
--   STAGE1-T2/T2.5/T2.6 報告整合後修復策略:
--     T3a 防線 → T3b 主修 HOLDINGS → T3c 收尾 → T3d WEEKLY_PICKS
--   T3a 是 0 風險防線:只動 schema、加防線欄位、不動 LLM 寫入主邏輯。
--
-- 4 個新欄位 (quack_predictions + quack_judgments 共用):
--   source                — 'llm_holdings' / 'llm_daily_picks' / 'llm_backfill'
--                           / 'cron_X' / 'llm_headline' / 'llm_weekly_picks' 等
--   data_quality_status   — 'unverified' (default) / 'pre_upgrade_2026_04_25'
--                           / 'verified_clean' / 'rejected_by_sanity'
--   basis_accuracy_pct    — entry_price vs 當時真實 close 的偏差 % (numeric, NULL ok)
--   basis_quality         — 'precise' (<1%) / 'acceptable' (1-5%) / 'biased' (5-25%)
--                           / 'invalid' (>25%) / NULL (尚未計算)
--
-- 應用方式:
--   透過 backend/routes/admin.py:/api/admin/exec_sql 套用,
--   或在 Supabase Studio 直接執行。
--
-- Down migration: 見 0018_quality_status_and_basis_DOWN.sql
-- ============================================================================

BEGIN;

-- =============== A. quack_predictions ===============
ALTER TABLE quack_predictions
  ADD COLUMN IF NOT EXISTS source              TEXT,
  ADD COLUMN IF NOT EXISTS data_quality_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS basis_accuracy_pct  NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS basis_quality       TEXT;

COMMENT ON COLUMN quack_predictions.source IS
  'LLM 寫入路徑來源:llm_holdings / llm_daily_picks / llm_backfill / cron_X 等';
COMMENT ON COLUMN quack_predictions.data_quality_status IS
  '資料品質狀態:unverified / pre_upgrade_2026_04_25 / verified_clean / rejected_by_sanity';
COMMENT ON COLUMN quack_predictions.basis_accuracy_pct IS
  'entry_price 跟當時真實 close 的偏差百分比 (abs((entry-close)/close)*100)';
COMMENT ON COLUMN quack_predictions.basis_quality IS
  '基準品質分級:precise (<1%) / acceptable (1-5%) / biased (5-25%) / invalid (>25%)';

CREATE INDEX IF NOT EXISTS idx_qp_data_quality_status
  ON quack_predictions(data_quality_status);
CREATE INDEX IF NOT EXISTS idx_qp_source
  ON quack_predictions(source);


-- =============== B. quack_judgments ===============
-- 為 T3d WEEKLY_PICKS 預先準備
ALTER TABLE quack_judgments
  ADD COLUMN IF NOT EXISTS source              TEXT,
  ADD COLUMN IF NOT EXISTS data_quality_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS basis_accuracy_pct  NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS basis_quality       TEXT;

COMMENT ON COLUMN quack_judgments.source IS
  'LLM 寫入路徑來源:llm_headline / llm_weekly_picks / llm_homework 等';
COMMENT ON COLUMN quack_judgments.data_quality_status IS
  '資料品質狀態:同 quack_predictions';
COMMENT ON COLUMN quack_judgments.basis_accuracy_pct IS
  '對於 weekly_picks 類型,picks 內 target_price 的整批平均偏差';
COMMENT ON COLUMN quack_judgments.basis_quality IS
  '同 quack_predictions';

CREATE INDEX IF NOT EXISTS idx_qj_data_quality_status
  ON quack_judgments(data_quality_status);
CREATE INDEX IF NOT EXISTS idx_qj_source
  ON quack_judgments(source);

COMMIT;

-- ============================================================================
-- 驗證 query (套用後手動跑):
--
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'quack_predictions'
--       AND column_name IN ('source','data_quality_status','basis_accuracy_pct','basis_quality')
--     ORDER BY ordinal_position;
--   → 應看到 4 列
--
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'quack_judgments'
--       AND column_name IN ('source','data_quality_status','basis_accuracy_pct','basis_quality')
--     ORDER BY ordinal_position;
--   → 應看到 4 列
--
--   SELECT data_quality_status, count(*) FROM quack_predictions
--     GROUP BY data_quality_status;
--   → 預設值'unverified'套到所有舊 row
-- ============================================================================
