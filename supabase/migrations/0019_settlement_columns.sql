-- ============================================================================
-- Migration 0019: 結算欄位 — 給結算 cron 用(T3d 啟動)
--
-- 為什麼:
--   T2.6 觀察 B:quack_judgments(weekly_picks) 寫的預測「永遠不被結算」
--   跟憲法 Section 5「每次預測都公開命中率」牴觸。
--
--   T3a-cleanup 範圍:預先把 schema 加好,寫好結算 cron 程式碼但「disabled」,
--   T3d 修完 WEEKLY_PICKS 後啟動 cron。
--
-- 重要:quack_predictions 已有 evaluated_at / actual_price_at_deadline / hit_or_miss
--   (不需重複加;見實際 schema 反證 migration 0006 部分未套用)
--   只補 settle_method 一欄區分 manual / auto_cron / admin。
--
-- quack_judgments 沒有任何結算欄位,本 migration 全套 4 欄。
--
-- Down migration:見 0019_settlement_columns_DOWN.sql
-- ============================================================================

BEGIN;

-- =============== A. quack_predictions(只補 settle_method)===============
-- 既有:evaluated_at TIMESTAMPTZ, actual_price_at_deadline NUMERIC, hit_or_miss TEXT
ALTER TABLE quack_predictions
  ADD COLUMN IF NOT EXISTS settle_method   TEXT;

COMMENT ON COLUMN quack_predictions.settle_method IS
  '結算方式:auto_cron / manual / admin';

CREATE INDEX IF NOT EXISTS idx_qp_pending_settle
  ON quack_predictions(deadline) WHERE evaluated_at IS NULL;


-- =============== B. quack_judgments(全套 4 欄)===============
ALTER TABLE quack_judgments
  ADD COLUMN IF NOT EXISTS settled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_close   NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS hit_or_miss     TEXT,
  ADD COLUMN IF NOT EXISTS settle_method   TEXT;

COMMENT ON COLUMN quack_judgments.settled_at IS
  '結算時間。weekly_picks 類型才會結算,headline 類型留 null';
COMMENT ON COLUMN quack_judgments.settled_close IS
  'weekly_picks 結算用:每檔 picks 在 deadline 那日的平均 close';
COMMENT ON COLUMN quack_judgments.hit_or_miss IS
  '結算結果:hit / miss / pending(weekly_picks 整批的整體判定,>=60% pick 命中算 hit)';
COMMENT ON COLUMN quack_judgments.settle_method IS
  'auto_cron / manual / admin';

CREATE INDEX IF NOT EXISTS idx_qj_pending_settle
  ON quack_judgments(judgment_type, judgment_date) WHERE settled_at IS NULL;

COMMIT;

-- ============================================================================
-- 驗證(套用後手動跑):
--
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'quack_predictions' AND column_name = 'settle_method';
--   → 應有 1 列
--
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'quack_judgments'
--       AND column_name IN ('settled_at','settled_close','hit_or_miss','settle_method')
--     ORDER BY ordinal_position;
--   → 應有 4 列
-- ============================================================================
