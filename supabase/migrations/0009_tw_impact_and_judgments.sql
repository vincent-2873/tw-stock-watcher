-- ============================================================================
-- Migration 0009: 對台股影響度評分 + 呱呱判斷快取表
--
-- 目的:
--   1. people_statements 加 `tw_impact_score INT 0-10` 取代前端啟發式 isTWImpact()
--   2. 建 quack_judgments 表存呱呱中樞 AI 推理結果(headline / weekly_picks / homework)
--      用於 008a 階段 2 縮水版兩個函數 + Bug #1 手動重整
--
-- Refs: NEXT_TASK_008a 階段 1 Bug #2 / 階段 2 縮水
-- ============================================================================

BEGIN;

-- =============== A. people_statements.tw_impact_score ===============
ALTER TABLE people_statements
  ADD COLUMN IF NOT EXISTS tw_impact_score SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN people_statements.tw_impact_score IS
  '對台股影響度 0-10。由 backfill 腳本依 ticker / urgency / topic 啟發式計算,後續可改 AI 評分。';

CREATE INDEX IF NOT EXISTS idx_statements_tw_impact
  ON people_statements(tw_impact_score DESC, said_at DESC);


-- =============== B. quack_judgments(呱呱中樞 AI 判斷快取) ===============
CREATE TABLE IF NOT EXISTS quack_judgments (
  id              SERIAL PRIMARY KEY,
  judgment_type   TEXT NOT NULL,         -- 'headline' / 'weekly_picks' / 'homework'
  judgment_date   DATE NOT NULL,         -- 該判斷對應的日期(以 TPE 計)
  content_json    JSONB NOT NULL,        -- 結構依 type:
                                         --   headline    : { water_status, quack_view, reason, watch_for }
                                         --   weekly_picks: { picks: [...10 檔...] }
                                         --   homework    : { opener, watch, avoid, updated_at }
  model           TEXT,                  -- 例:claude-sonnet-4-5-20250929
  input_snapshot  JSONB,                 -- 餵給 Claude 的當下市場快照(供事後 debug)
  tokens_used     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (judgment_type, judgment_date)
);

CREATE INDEX IF NOT EXISTS idx_quack_judgments_type_date
  ON quack_judgments(judgment_type, judgment_date DESC);

COMMENT ON TABLE quack_judgments IS
  '呱呱中樞 AI 推理結果快取。每天每 type 一筆,UPSERT。前端透過 endpoint 讀取,過期由 admin 手動或 cron 觸發 refresh。';

ALTER TABLE quack_judgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_quack_judgments" ON quack_judgments;
CREATE POLICY "read_quack_judgments" ON quack_judgments FOR SELECT USING (true);

COMMIT;
