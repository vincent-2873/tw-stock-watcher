-- ============================================================================
-- Migration 0006: Agent 預測系統 + 會議系統 + 長期記憶快照
--
-- 依據:
--   - SYSTEM_CONSTITUTION.md Section 5 (預測) + Section 9 (DB schema)
--   - ADR-002 (預測系統) + ADR-003 (記憶三層)
--
-- 本 migration 做的事:
--   1. 擴充 quack_predictions 補齊憲法 Section 5.1 缺的 9 個欄位
--      (不建新 predictions 表,避免歷史資料搬遷風險)
--   2. 新建 meetings / agent_stats / agent_learning_notes
--             / agent_debates / agent_memory_snapshots 五張全新表
--   3. 補 index
--   4. RLS (anon read-only,寫入走 service role)
--
-- 應用方式:
--   此檔案建好但「未 apply」— 等 NEXT_TASK #002 確認後
--   手動 supabase db push 或在 Supabase Studio 執行
-- ============================================================================

BEGIN;

-- ===========================================================================
-- Part A: 擴充 quack_predictions
-- ===========================================================================
-- 補齊憲法 Section 5.1 缺的欄位:
--   agent_id / agent_name             (多 agent 支援)
--   target_symbol / target_name       (結構化標的)
--   direction                         (bullish/bearish/neutral)
--   target_price                      (目標價)
--   current_price_at_prediction       (下預測當下的價)
--   deadline                          (TIMESTAMPTZ,比 DATE 精準)
--   success_criteria                  (agent 自訂「命中」標準)
--   supporting_departments            (引用了哪些部門情報)
--   status                            (active/hit/missed/cancelled)
--   settled_at                        (已存在但改對齊命名)
--   actual_price_at_deadline
--   learning_note                     (失敗必填)
--   meeting_id                        (關聯會議)

ALTER TABLE quack_predictions
  ADD COLUMN IF NOT EXISTS agent_id                   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS agent_name                 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS target_symbol              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS target_name                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS direction                  VARCHAR(20)
    CHECK (direction IS NULL OR direction IN ('bullish', 'bearish', 'neutral')),
  ADD COLUMN IF NOT EXISTS target_price               DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS current_price_at_prediction DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS deadline                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS success_criteria           TEXT,
  ADD COLUMN IF NOT EXISTS supporting_departments     JSONB,
  ADD COLUMN IF NOT EXISTS status                     VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'hit', 'missed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS actual_price_at_deadline   DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS learning_note              TEXT,
  ADD COLUMN IF NOT EXISTS meeting_id                 VARCHAR(50);

-- 把舊的 evaluated_at 對齊命名(不改舊欄,新增同義 alias view 做相容)
-- hit_or_miss 與 status 語意重疊,保留 hit_or_miss 當舊系統,status 給新系統使用
-- 未來 backend/routes/quack.py:239, 246, 294 改用 status 之後,
-- 再另做 migration 刪 hit_or_miss

-- 新增 index
CREATE INDEX IF NOT EXISTS idx_qp_agent          ON quack_predictions(agent_id);
CREATE INDEX IF NOT EXISTS idx_qp_target_symbol  ON quack_predictions(target_symbol);
CREATE INDEX IF NOT EXISTS idx_qp_status         ON quack_predictions(status);
CREATE INDEX IF NOT EXISTS idx_qp_deadline       ON quack_predictions(deadline);
CREATE INDEX IF NOT EXISTS idx_qp_meeting        ON quack_predictions(meeting_id);


-- ===========================================================================
-- Part B: meetings 表
-- ===========================================================================
CREATE TABLE IF NOT EXISTS meetings (
  meeting_id          VARCHAR(50) PRIMARY KEY,
  meeting_type        VARCHAR(50) NOT NULL,
    -- 'pre_market' / 'mid_day' / 'post_market' / 'weekly' / 'monthly' /
    -- 'event_triggered' / 'saturday_summary' / 'sunday_preview'
  scheduled_at        TIMESTAMPTZ NOT NULL,
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  chair_agent_id      VARCHAR(50) NOT NULL,
  attendees           JSONB NOT NULL DEFAULT '[]',  -- array of agent_ids
  content_markdown    TEXT NOT NULL,
  predictions_created JSONB DEFAULT '[]',
  predictions_settled JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_type      ON meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at DESC);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read meetings" ON meetings;
CREATE POLICY "anon read meetings" ON meetings FOR SELECT USING (true);


-- ===========================================================================
-- Part C: agent_stats 表(累計績效)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS agent_stats (
  agent_id              VARCHAR(50) PRIMARY KEY,
  agent_name            VARCHAR(100) NOT NULL,
  total_predictions     INT NOT NULL DEFAULT 0,
  hits                  INT NOT NULL DEFAULT 0,
  misses                INT NOT NULL DEFAULT 0,
  cancelled             INT NOT NULL DEFAULT 0,
  win_rate              DECIMAL(5, 4),
  -- 最佳標的
  best_symbol           VARCHAR(20),
  best_symbol_win_rate  DECIMAL(5, 4),
  -- 最差標的
  worst_symbol          VARCHAR(20),
  worst_symbol_win_rate DECIMAL(5, 4),
  -- 近期
  last_30d_predictions  INT DEFAULT 0,
  last_30d_win_rate     DECIMAL(5, 4),
  last_updated          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read agent_stats" ON agent_stats;
CREATE POLICY "anon read agent_stats" ON agent_stats FOR SELECT USING (true);


-- ===========================================================================
-- Part D: agent_learning_notes 表(失敗學習筆記)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS agent_learning_notes (
  note_id          SERIAL PRIMARY KEY,
  agent_id         VARCHAR(50) NOT NULL,
  prediction_id    INT,  -- 對應 quack_predictions.id
  date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context          TEXT NOT NULL,       -- 當時的情境
  mistake          TEXT NOT NULL,       -- 我做錯了什麼
  lesson           TEXT NOT NULL,       -- 學到的教訓
  correction_plan  TEXT,                -- 下次怎麼修正
  applied          BOOLEAN DEFAULT FALSE  -- 是否已應用到後續預測
);

CREATE INDEX IF NOT EXISTS idx_learning_notes_agent     ON agent_learning_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_date      ON agent_learning_notes(date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_notes_applied   ON agent_learning_notes(applied) WHERE applied = false;

ALTER TABLE agent_learning_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read agent_learning_notes" ON agent_learning_notes;
CREATE POLICY "anon read agent_learning_notes" ON agent_learning_notes FOR SELECT USING (true);


-- ===========================================================================
-- Part E: agent_debates 表(辯論紀錄)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS agent_debates (
  debate_id          SERIAL PRIMARY KEY,
  meeting_id         VARCHAR(50) REFERENCES meetings(meeting_id),
  challenger_id      VARCHAR(50) NOT NULL,  -- 通常是 🦊 質疑官
  defender_id        VARCHAR(50) NOT NULL,  -- 被挑戰的 agent
  topic              TEXT NOT NULL,
  challenger_point   TEXT NOT NULL,
  defender_response  TEXT NOT NULL,
  winner             VARCHAR(50),  -- 'challenger' / 'defender' / 'draw' / 'pending'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debates_meeting    ON agent_debates(meeting_id);
CREATE INDEX IF NOT EXISTS idx_debates_challenger ON agent_debates(challenger_id);
CREATE INDEX IF NOT EXISTS idx_debates_defender   ON agent_debates(defender_id);

ALTER TABLE agent_debates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read agent_debates" ON agent_debates;
CREATE POLICY "anon read agent_debates" ON agent_debates FOR SELECT USING (true);


-- ===========================================================================
-- Part F: agent_memory_snapshots 表(長期記憶每日快照)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS agent_memory_snapshots (
  snapshot_id      SERIAL PRIMARY KEY,
  agent_id         VARCHAR(50) NOT NULL,
  snapshot_date    DATE NOT NULL,
  identity_core    TEXT,             -- 身份核心(人類維護區)
  stats_snapshot   JSONB,             -- 當日戰績
  recent_lessons   JSONB,             -- 近期教訓
  debate_record    JSONB,             -- 辯論紀錄
  new_methods      JSONB,             -- 正在嘗試的新方法
  full_markdown    TEXT,              -- 整份 MD 檔備份(Git 之外的第二層備援)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_snapshot_daily
  ON agent_memory_snapshots(agent_id, snapshot_date);

ALTER TABLE agent_memory_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read agent_memory_snapshots" ON agent_memory_snapshots;
CREATE POLICY "anon read agent_memory_snapshots" ON agent_memory_snapshots FOR SELECT USING (true);


-- ===========================================================================
-- Part G: Foreign Key 反向補(quack_predictions.meeting_id → meetings)
-- ===========================================================================
ALTER TABLE quack_predictions
  DROP CONSTRAINT IF EXISTS fk_qp_meeting;

ALTER TABLE quack_predictions
  ADD CONSTRAINT fk_qp_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
    ON DELETE SET NULL;


-- ===========================================================================
-- Part H: seed agent_stats(12 個 agent 先佔位)
-- ===========================================================================
INSERT INTO agent_stats (agent_id, agent_name) VALUES
  ('guagua',              '呱呱(所主)'),
  ('owl_fundamentalist',  '評級師'),
  ('hedgehog_technical',  '技術分析師'),
  ('squirrel_chip',       '籌碼觀察家'),
  ('meerkat_quant',       '量化科學家'),
  ('fox_skeptic',         '質疑官'),
  ('pangolin_risk',       '風險管理師'),
  ('analyst_a',           '投資分析師 A'),
  ('analyst_b',           '投資分析師 B'),
  ('analyst_c',           '投資分析師 C'),
  ('analyst_d',           '投資分析師 D'),
  ('analyst_e',           '投資分析師 E')
ON CONFLICT (agent_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- 驗證 query(執行後手動跑):
--
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'quack_predictions' ORDER BY ordinal_position;
--   → 應看到 hit_or_miss + status + 9 個新欄位共存
--
--   SELECT COUNT(*) FROM agent_stats;
--   → 應 >= 12
--
--   SELECT COUNT(*) FROM meetings;
--   → 0 (尚未產生任何會議)
-- ============================================================================
