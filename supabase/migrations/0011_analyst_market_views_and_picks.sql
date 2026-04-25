-- ============================================
-- NEXT_TASK_008c 5 位分析師活起來 — 大盤觀點 + 每日推薦
-- ============================================

-- =============== analyst_market_views(每位每日大盤觀點) ===============
CREATE TABLE IF NOT EXISTS analyst_market_views (
  id            SERIAL PRIMARY KEY,
  agent_id      VARCHAR(50) NOT NULL,                     -- analyst_a..e / guagua
  view_date     DATE NOT NULL,
  market_view   TEXT NOT NULL,                            -- 1-2 句完整觀點
  key_focus     JSONB DEFAULT '[]'::jsonb,                -- ["半導體","外資期貨","Fed"]
  bias          TEXT,                                     -- bullish / bearish / neutral
  confidence    INT,                                      -- 0-100
  model         VARCHAR(50),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_amv_agent_date ON analyst_market_views(agent_id, view_date DESC);
CREATE INDEX IF NOT EXISTS idx_amv_date       ON analyst_market_views(view_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_amv_unique ON analyst_market_views(agent_id, view_date);

ALTER TABLE analyst_market_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read amv" ON analyst_market_views;
CREATE POLICY "anon read amv" ON analyst_market_views FOR SELECT USING (true);


-- =============== analyst_daily_picks(每位每日重點 3-5 檔) ===============
CREATE TABLE IF NOT EXISTS analyst_daily_picks (
  id                SERIAL PRIMARY KEY,
  agent_id          VARCHAR(50) NOT NULL,
  pick_date         DATE NOT NULL,
  target_symbol     VARCHAR(20) NOT NULL,
  target_name       VARCHAR(100),
  strength          INT NOT NULL CHECK (strength BETWEEN 1 AND 10),  -- 1-10 推薦強度
  entry_price_low   DECIMAL(12, 2),
  entry_price_high  DECIMAL(12, 2),
  reason            TEXT NOT NULL,
  prediction_id     INT,                                  -- 對應 quack_predictions.id(可選)
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adp_agent_date ON analyst_daily_picks(agent_id, pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_adp_date       ON analyst_daily_picks(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_adp_symbol     ON analyst_daily_picks(target_symbol);

ALTER TABLE analyst_daily_picks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read adp" ON analyst_daily_picks;
CREATE POLICY "anon read adp" ON analyst_daily_picks FOR SELECT USING (true);
