-- ============================================
-- Migration 0013: 歷史回溯系統(NEXT_TASK_008d-1)
--
-- 兩張新表:
--   1. stock_prices_historical — 歷史日 K 快照(從 FinMind 抓 90 天)
--   2. analyst_winrate_timeline — 每位分析師每日滾動勝率
-- ============================================

BEGIN;

-- ===========================================================================
-- Part A: stock_prices_historical
-- ===========================================================================
-- 從 FinMind TaiwanStockPrice 抓的歷史日 K
-- 用於回溯結算時對照預測 vs 實際

CREATE TABLE IF NOT EXISTS stock_prices_historical (
    id              SERIAL PRIMARY KEY,
    stock_id        VARCHAR(20) NOT NULL,
    trade_date      DATE NOT NULL,
    open            DECIMAL(12, 2),
    high            DECIMAL(12, 2),
    low             DECIMAL(12, 2),
    close           DECIMAL(12, 2) NOT NULL,
    volume          BIGINT,
    spread          DECIMAL(12, 2),  -- 漲跌幅
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sph_stock_date
    ON stock_prices_historical(stock_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_sph_date
    ON stock_prices_historical(trade_date DESC);

ALTER TABLE stock_prices_historical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read sph" ON stock_prices_historical;
CREATE POLICY "anon read sph" ON stock_prices_historical FOR SELECT USING (true);


-- ===========================================================================
-- Part B: analyst_winrate_timeline
-- ===========================================================================
-- 每位分析師每個交易日的滾動勝率 + 累積勝率
-- 給前台勝率走勢圖用

CREATE TABLE IF NOT EXISTS analyst_winrate_timeline (
    id                       SERIAL PRIMARY KEY,
    agent_id                 VARCHAR(50) NOT NULL,
    timeline_date            DATE NOT NULL,
    rolling_30d_winrate      DECIMAL(5, 4),
    rolling_30d_predictions  INT NOT NULL DEFAULT 0,
    cumulative_winrate       DECIMAL(5, 4),
    cumulative_predictions   INT NOT NULL DEFAULT 0,
    cumulative_hits          INT NOT NULL DEFAULT 0,
    cumulative_misses        INT NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_awt_agent_date
    ON analyst_winrate_timeline(agent_id, timeline_date);
CREATE INDEX IF NOT EXISTS idx_awt_date
    ON analyst_winrate_timeline(timeline_date DESC);

ALTER TABLE analyst_winrate_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read awt" ON analyst_winrate_timeline;
CREATE POLICY "anon read awt" ON analyst_winrate_timeline FOR SELECT USING (true);


-- ===========================================================================
-- Part C: agent_stats 補欄位(歷史回溯期間)
-- ===========================================================================
ALTER TABLE agent_stats
    ADD COLUMN IF NOT EXISTS last_90d_predictions INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_90d_win_rate    DECIMAL(5, 4),
    ADD COLUMN IF NOT EXISTS backfill_period_start DATE,
    ADD COLUMN IF NOT EXISTS backfill_period_end   DATE;

COMMIT;

-- ============================================================================
-- 驗證 query(套上線後手動跑):
--
--   SELECT COUNT(*) FROM stock_prices_historical;
--   → 應約 8000-15000 筆(150 stocks × 60 trading days)
--
--   SELECT COUNT(*) FROM analyst_winrate_timeline;
--   → 應約 300 筆(5 analysts × 60 days)
--
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'agent_stats' AND column_name LIKE 'last_90d%';
--   → 應有 last_90d_predictions / last_90d_win_rate 兩欄
-- ============================================================================
