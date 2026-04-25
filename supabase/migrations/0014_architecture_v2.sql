-- ============================================
-- Migration 0014: 分析師架構 v2 標記(NEXT_TASK_008d-2)
--
-- 主要任務:
--   1. quack_predictions 加 architecture_version 欄位(從 evidence JSONB 提升為 top-level)
--   2. agent_learning_notes 加 architecture_version
--   3. agent_stats 加 v1_winrate / v2_winrate / v1_predictions / v2_predictions / normalized_winrate
--   4. analyst_winrate_timeline 加 architecture_version(允許 mixed)
--
-- 重要:本 migration 是「效能 + 查詢便利」優化。
--   即使未套上線,系統仍可正常運作(透過 evidence->>'architecture_version' 查詢)。
--   套上線後,index 加速 + API 邏輯改用 top-level 欄位查詢。
--
-- 套法:Supabase Studio → SQL Editor → 貼上整段 → Run
-- ============================================

BEGIN;

-- ===========================================================================
-- Part A: quack_predictions
-- ===========================================================================
ALTER TABLE quack_predictions ADD COLUMN IF NOT EXISTS architecture_version VARCHAR(10) DEFAULT 'v1';

-- 把 evidence JSONB 裡已標的 architecture_version 提升到 top-level
UPDATE quack_predictions
SET architecture_version = COALESCE(evidence->>'architecture_version', 'v1')
WHERE architecture_version IS NULL OR architecture_version = '';

CREATE INDEX IF NOT EXISTS idx_quack_predictions_architecture_version
    ON quack_predictions(architecture_version);

-- ===========================================================================
-- Part B: agent_learning_notes
-- ===========================================================================
ALTER TABLE agent_learning_notes ADD COLUMN IF NOT EXISTS architecture_version VARCHAR(10) DEFAULT 'v1';

-- 從關聯的 prediction 同步
UPDATE agent_learning_notes ln
SET architecture_version = COALESCE(qp.architecture_version, 'v1')
FROM quack_predictions qp
WHERE ln.prediction_id = qp.id
  AND (ln.architecture_version IS NULL OR ln.architecture_version = '');

CREATE INDEX IF NOT EXISTS idx_agent_learning_notes_architecture_version
    ON agent_learning_notes(architecture_version);

-- ===========================================================================
-- Part C: agent_stats — 加 v1 / v2 / normalized 欄位
-- ===========================================================================
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v1_predictions INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v1_hits INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v1_misses INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v1_winrate DECIMAL(5, 4);

ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v2_predictions INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v2_hits INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v2_misses INT DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS v2_winrate DECIMAL(5, 4);

-- normalized_winrate:依 success_criteria 嚴格度作公平比較
--   strict: 1.0 → 不打折
--   strict_window: 0.95
--   quant (90%): 0.9
--   segmented (66%): 0.7
--   loose (80%): 0.8
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS normalized_winrate DECIMAL(5, 4);
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS strictness_coefficient DECIMAL(3, 2);

-- ===========================================================================
-- Part D: analyst_winrate_timeline
-- ===========================================================================
-- timeline 一個日期的 stats 可能由 v1+v2 混算,因此預設 'mixed'
ALTER TABLE analyst_winrate_timeline ADD COLUMN IF NOT EXISTS architecture_version VARCHAR(10) DEFAULT 'mixed';

-- 標出 v1 only / v2 only(時間上非交疊區間)
-- 在 008d-2 跑完後由程式碼依日期區段決定填值,這裡只先建欄位

-- ===========================================================================
-- 驗證 query(套完跑一次)
-- ===========================================================================
-- SELECT architecture_version, COUNT(*) FROM quack_predictions GROUP BY architecture_version;
-- SELECT architecture_version, COUNT(*) FROM agent_learning_notes GROUP BY architecture_version;
-- SELECT agent_id, total_predictions, v1_predictions, v2_predictions, win_rate, v1_winrate, v2_winrate, normalized_winrate FROM agent_stats ORDER BY agent_id;

COMMIT;
