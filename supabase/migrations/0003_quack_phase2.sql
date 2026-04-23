-- =================================================================
-- Vincent Stock Intelligence System — Phase 2 智慧升級 schema
-- 19_V2_UPGRADE_BRIEF.md 對應
--   · quack_predictions   — 呱呱自我追蹤(學習力)
--   · quack_reasoning     — 三層推論快取
--   · social_mentions     — 台股社群熱度(PTT / Dcard / CMoney)
-- =================================================================

-- 呱呱預測與事後驗證
CREATE TABLE IF NOT EXISTS quack_predictions (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  prediction_type VARCHAR(50) NOT NULL,      -- 'topic_heat' / 'stock_pick' / 'sector_rotation' / 'market_direction'
  subject         VARCHAR(100) NOT NULL,     -- 題材名、股票代號、產業名
  prediction      TEXT NOT NULL,             -- 呱呱預測了什麼(自然語言)
  confidence      INT NOT NULL DEFAULT 50,   -- 信心度 0-100
  timeframe       VARCHAR(20) NOT NULL,      -- '1d' / '1w' / '1m'
  evaluate_after  DATE NOT NULL,             -- 何時該驗證(用 timeframe 計算)
  actual_result   TEXT,                      -- 實際結果(事後填)
  hit_or_miss     VARCHAR(10),               -- 'hit' / 'miss' / 'partial' / 'n/a'
  reasoning_error TEXT,                      -- 如果錯,Claude 分析錯在哪
  evidence        JSONB,                     -- 當下證據快照
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qp_date          ON quack_predictions (date DESC);
CREATE INDEX IF NOT EXISTS idx_qp_type_subject  ON quack_predictions (prediction_type, subject);
CREATE INDEX IF NOT EXISTS idx_qp_pending_eval  ON quack_predictions (evaluate_after) WHERE evaluated_at IS NULL;

ALTER TABLE quack_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read quack_predictions" ON quack_predictions;
CREATE POLICY "anon read quack_predictions" ON quack_predictions FOR SELECT USING (true);


-- 呱呱三層推論結果(快取)
CREATE TABLE IF NOT EXISTS quack_reasoning (
  id             SERIAL PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  fact_layer     TEXT NOT NULL,             -- 第一層:今天發生了什麼(≤ 3 句)
  causal_layer   TEXT NOT NULL,             -- 第二層:為什麼會這樣(因 A → 所以 B)
  meaning_layer  TEXT NOT NULL,             -- 第三層:對 Vincent 的操作意味
  counter_view   TEXT,                      -- 反方觀點(如果我錯了,哪裡錯?)
  input_snapshot JSONB,                     -- 當下輸入的市場資料快照
  model          VARCHAR(50) DEFAULT 'claude-sonnet-4-5',
  tokens_used    INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_date ON quack_reasoning (date DESC);

ALTER TABLE quack_reasoning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read quack_reasoning" ON quack_reasoning;
CREATE POLICY "anon read quack_reasoning" ON quack_reasoning FOR SELECT USING (true);


-- 社群提及(PTT / Dcard / CMoney / X)
CREATE TABLE IF NOT EXISTS social_mentions (
  id            SERIAL PRIMARY KEY,
  stock_code    VARCHAR(10),                -- 可為 NULL,代表只提題材
  topic_slug    VARCHAR(50),                -- 關聯 topics.slug
  source        VARCHAR(20) NOT NULL,       -- 'ptt' / 'dcard' / 'cmoney' / 'mobile01' / 'x'
  post_url      TEXT NOT NULL,
  post_title    TEXT,
  mention_count INT NOT NULL DEFAULT 1,
  push_count    INT NOT NULL DEFAULT 0,     -- 推文數
  boo_count     INT NOT NULL DEFAULT 0,     -- 噓文數
  reply_count   INT NOT NULL DEFAULT 0,
  sentiment     VARCHAR(20),                -- 'bullish' / 'bearish' / 'neutral' / 'mixed'
  sentiment_score INT,                      -- -100 ~ 100
  hot_keywords  JSONB,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sm_stock_time  ON social_mentions (stock_code, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_topic_time  ON social_mentions (topic_slug, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_source_time ON social_mentions (source, captured_at DESC);

ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read social_mentions" ON social_mentions;
CREATE POLICY "anon read social_mentions" ON social_mentions FOR SELECT USING (true);


-- 自動觸發警示(Phase 3 類別 C1)
CREATE TABLE IF NOT EXISTS auto_alerts (
  id              SERIAL PRIMARY KEY,
  trigger_type    VARCHAR(50) NOT NULL,     -- 'foreign_heavy_sell' / 'limit_up' / 'topic_surge' / 'vip_statement'
  trigger_detail  JSONB NOT NULL,           -- e.g. {"amount": "+250億", "reason": "Tesla 財報"}
  ai_analysis     TEXT,
  affected_stocks JSONB,                    -- [{"code":"3443","impact":"negative"}, ...]
  urgency         INT NOT NULL DEFAULT 5,   -- 1-10
  pushed_to_line  BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_user    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aa_created_unread ON auto_alerts (created_at DESC) WHERE read_by_user = FALSE;

ALTER TABLE auto_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read auto_alerts" ON auto_alerts;
CREATE POLICY "anon read auto_alerts" ON auto_alerts FOR SELECT USING (true);

-- =================================================================
-- 驗收查詢
--   SELECT COUNT(*) FROM quack_predictions;    -- 0
--   SELECT COUNT(*) FROM quack_reasoning;      -- 0
--   SELECT COUNT(*) FROM social_mentions;      -- 0
--   SELECT COUNT(*) FROM auto_alerts;          -- 0
-- =================================================================
