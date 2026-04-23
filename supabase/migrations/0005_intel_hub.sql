-- ============================================
-- VSIS v2.1 情報中樞(Intel Hub)
-- 4 張表:intel_sources / intel_articles / watched_people / people_statements
-- 對應 20_INTEL_HUB_UPGRADE.md Phase 1 Day 1-3
-- ============================================

-- =============== 情報來源 ===============
CREATE TABLE IF NOT EXISTS intel_sources (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  type              TEXT,                          -- news / forum / twitter / blog / podcast
  region            TEXT,                          -- tw / us / global
  url               TEXT,
  rss_url           TEXT,
  language          TEXT,                          -- zh-TW / en / zh-CN
  credibility       SMALLINT,                      -- 公信力 1-10
  update_frequency  INT,                           -- 分鐘
  tier              SMALLINT DEFAULT 1,            -- 1=必接 / 2=付費 / 3=選配
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intel_sources_tier ON intel_sources(tier, is_active);

-- =============== 抓到的文章 ===============
CREATE TABLE IF NOT EXISTS intel_articles (
  id                SERIAL PRIMARY KEY,
  source_id         INT REFERENCES intel_sources(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  url               TEXT UNIQUE,
  author            TEXT,
  published_at      TIMESTAMPTZ,
  raw_content       TEXT,
  language          TEXT,

  -- AI 分析(Phase 2 會填)
  ai_summary            TEXT,
  ai_sentiment          TEXT,                      -- bullish / bearish / neutral / mixed
  ai_sentiment_score    INT,                       -- -100 ~ +100
  ai_confidence         INT,                       -- 0-100
  ai_reasoning          TEXT,
  ai_counter_arguments  JSONB DEFAULT '[]'::jsonb,
  ai_key_points         JSONB DEFAULT '[]'::jsonb,
  ai_affected_stocks    JSONB DEFAULT '[]'::jsonb, -- [{code,name,impact,strength,reasoning}]
  ai_affected_sectors   JSONB DEFAULT '[]'::jsonb,
  ai_importance         SMALLINT,                  -- 1-10
  ai_urgency            SMALLINT,                  -- 1-10
  ai_quack_perspective  TEXT,
  ai_time_horizon       TEXT,                      -- short / medium / long
  ai_related_topics     JSONB DEFAULT '[]'::jsonb,
  ai_analyzed_at        TIMESTAMPTZ,

  captured_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON intel_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON intel_articles(ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_articles_importance ON intel_articles(ai_importance DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON intel_articles(source_id, published_at DESC);

-- =============== 重點人物 ===============
CREATE TABLE IF NOT EXISTS watched_people (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  name_zh           TEXT,
  role              TEXT,                          -- "NVIDIA CEO"
  category          TEXT,                          -- central_bank / tech_ceo / investor / tw_ceo / analyst / politician
  priority          SMALLINT,                      -- 1-10 重要度
  x_handle          TEXT,                          -- Twitter handle
  x_id              TEXT,                          -- Twitter User ID(quot API 用)
  linkedin_url      TEXT,
  home_url          TEXT,
  affected_stocks   JSONB DEFAULT '[]'::jsonb,     -- 影響的台股代號陣列
  affected_sectors  JSONB DEFAULT '[]'::jsonb,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_people_priority ON watched_people(priority DESC, is_active);
CREATE INDEX IF NOT EXISTS idx_people_category ON watched_people(category);

-- =============== 人物發言 ===============
CREATE TABLE IF NOT EXISTS people_statements (
  id                    SERIAL PRIMARY KEY,
  person_id             INT REFERENCES watched_people(id) ON DELETE CASCADE,
  source                TEXT,                      -- x / press / interview / earnings / speech
  source_url            TEXT,
  statement_text        TEXT,
  statement_translated  TEXT,

  -- AI 分析
  ai_summary            TEXT,
  ai_topic              TEXT,                      -- rate / ai_capex / product_launch
  ai_sentiment          TEXT,                      -- bullish / bearish / neutral
  ai_market_impact      TEXT,
  ai_affected_stocks    JSONB DEFAULT '[]'::jsonb,
  ai_urgency            SMALLINT,                  -- 1-10
  ai_analyzed_at        TIMESTAMPTZ,

  said_at               TIMESTAMPTZ,
  captured_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_statements_person ON people_statements(person_id, said_at DESC);
CREATE INDEX IF NOT EXISTS idx_statements_urgency ON people_statements(ai_urgency DESC, said_at DESC);

-- =============== RLS(anon 可讀,不可寫) ===============
ALTER TABLE intel_sources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_people     ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_statements  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_intel_sources"  ON intel_sources;
CREATE POLICY "read_intel_sources"  ON intel_sources  FOR SELECT USING (true);

DROP POLICY IF EXISTS "read_intel_articles" ON intel_articles;
CREATE POLICY "read_intel_articles" ON intel_articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "read_watched_people" ON watched_people;
CREATE POLICY "read_watched_people" ON watched_people FOR SELECT USING (true);

DROP POLICY IF EXISTS "read_people_statements" ON people_statements;
CREATE POLICY "read_people_statements" ON people_statements FOR SELECT USING (true);
