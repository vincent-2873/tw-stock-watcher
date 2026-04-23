-- ============================================
-- VSIS Upgrade: Industries / Topics / Ecosystems
-- Initial seed tables for 產業 → 題材 → 個股 體系
-- Run on Supabase SQL editor or via service_role
-- ============================================

-- ==========================================
-- 產業分類(三層:大類 / 子產業 / 題材)
-- ==========================================
CREATE TABLE IF NOT EXISTS industries (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    parent_id     TEXT REFERENCES industries(id) ON DELETE SET NULL,
    level         SMALLINT NOT NULL DEFAULT 1,  -- 1=大類 2=子產業 3=題材
    icon          TEXT,
    description   TEXT,
    heat_level    TEXT,                         -- extreme / high / medium / low
    heat_score    INT,
    representative_stocks JSONB DEFAULT '[]'::jsonb,
    key_drivers   JSONB DEFAULT '[]'::jsonb,
    related_topics JSONB DEFAULT '[]'::jsonb,
    meta          JSONB DEFAULT '{}'::jsonb,    -- 其他欄位備用
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_industries_parent ON industries(parent_id);
CREATE INDEX IF NOT EXISTS idx_industries_level ON industries(level);

-- ==========================================
-- 題材(active topics)
-- ==========================================
CREATE TABLE IF NOT EXISTS topics (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    industry_ids          JSONB DEFAULT '[]'::jsonb,
    heat_score            INT,
    heat_trend            TEXT,   -- rising / stable / falling
    start_date            DATE,
    expected_duration_days INT,
    expected_end_date     DATE,
    status                TEXT,   -- active / archived / watching
    stage                 TEXT,   -- starting / main_rally / mature / cooling
    catalysts             JSONB DEFAULT '[]'::jsonb,
    supply_chain          JSONB DEFAULT '{}'::jsonb,
    ai_summary            TEXT,
    investment_strategy   JSONB DEFAULT '{}'::jsonb,
    avoid_list            JSONB DEFAULT '[]'::jsonb,
    risk_factors          JSONB DEFAULT '[]'::jsonb,
    meta                  JSONB DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topics_heat ON topics(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);

-- ==========================================
-- 龍頭生態系(anchor + 關聯圖)
-- ==========================================
CREATE TABLE IF NOT EXISTS ecosystems (
    anchor_ticker        TEXT PRIMARY KEY,
    anchor_name          TEXT NOT NULL,
    anchor_english       TEXT,
    anchor_type          TEXT,   -- taiwan_leader / overseas_giant / hidden_champion
    industry             TEXT,
    global_position      TEXT,
    market_cap_ntd       TEXT,
    current_price_range  TEXT,
    key_description      TEXT,
    customers            JSONB DEFAULT '[]'::jsonb,
    cloud_customers      JSONB DEFAULT '[]'::jsonb,
    suppliers            JSONB DEFAULT '[]'::jsonb,
    competitors          JSONB DEFAULT '[]'::jsonb,
    downstream_partners  JSONB DEFAULT '{}'::jsonb,
    taiwan_beneficiary_stocks JSONB DEFAULT '[]'::jsonb,
    financial_projection JSONB DEFAULT '{}'::jsonb,
    meta                 JSONB DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecosystems_industry ON ecosystems(industry);

-- ==========================================
-- 觸發器:自動更新 updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_industries_updated ON industries;
CREATE TRIGGER trg_industries_updated
BEFORE UPDATE ON industries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_topics_updated ON topics;
CREATE TRIGGER trg_topics_updated
BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ecosystems_updated ON ecosystems;
CREATE TRIGGER trg_ecosystems_updated
BEFORE UPDATE ON ecosystems FOR EACH ROW EXECUTE FUNCTION set_updated_at();
