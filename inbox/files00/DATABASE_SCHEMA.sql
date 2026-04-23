-- ============================================================
-- VSIS 資料庫完整 Schema（PostgreSQL）
-- 版本：v1.0
-- 建立日期：2026-04-23
-- 用途：供 Claude Code 直接執行建立 VSIS 升級所需的資料表
-- ============================================================

-- ============================================================
-- 1. 產業分類表
-- ============================================================
CREATE TABLE IF NOT EXISTS industries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level_1 VARCHAR(50),           -- 大分類（半導體、電子零組件...）
    level_2 VARCHAR(50),           -- 子產業
    level_3 VARCHAR(50),           -- 進一步細分
    description TEXT,
    heat_score INT DEFAULT 0,      -- 熱度 0-100
    heat_trend VARCHAR(20),        -- rising / stable / falling
    key_factors JSONB,             -- 關鍵驅動因素
    representative_stocks JSONB,    -- 代表股陣列
    related_topics JSONB,          -- 相關題材 ID 陣列
    icon VARCHAR(10),              -- emoji 圖示
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_industries_heat ON industries(heat_score DESC);
CREATE INDEX idx_industries_level_1 ON industries(level_1);

-- ============================================================
-- 2. 題材表
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    industry_ids JSONB,            -- 相關產業 ID 陣列
    heat_score INT DEFAULT 0,
    heat_trend VARCHAR(20),
    start_date DATE,
    expected_duration_days INT,
    expected_end_date DATE,
    status VARCHAR(20),            -- active / cooling / emerging
    stage VARCHAR(30),             -- early / main_rally / consolidation / ending
    catalysts JSONB,               -- 催化劑事件陣列
    supply_chain JSONB,            -- 供應鏈分層資料
    ai_summary TEXT,               -- AI 生成摘要
    investment_strategy JSONB,     -- 投資策略（1w/1m/6m）
    avoid_list JSONB,              -- 避開清單
    risk_factors JSONB,            -- 風險因素
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topics_heat ON topics(heat_score DESC);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_industry ON topics USING gin(industry_ids);

-- ============================================================
-- 3. 個股表
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
    ticker VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_english VARCHAR(100),
    industry_ids JSONB,            -- 所屬產業 ID 陣列
    topic_ids JSONB,               -- 所屬題材 ID 陣列
    ecosystem_role JSONB,          -- 在生態系中的角色
    global_status JSONB,           -- 全球地位（市佔、技術、可替代性）
    vsis_score JSONB,              -- 四象限評分（含細項）
    heat_score INT DEFAULT 0,
    price DECIMAL(10,2),
    price_updated_at TIMESTAMP,
    daily_change_pct DECIMAL(5,2),
    volume BIGINT,
    volume_ma20 BIGINT,
    consecutive_days INT,          -- 連漲/連跌天數
    recommendation VARCHAR(20),    -- buy / wait / avoid / strong_buy
    investment_grade VARCHAR(5),   -- A+, A, B+, B, C, D
    target_prices JSONB,           -- 短/中/長目標價
    stop_loss DECIMAL(10,2),
    eps DECIMAL(10,2),
    pe_ratio DECIMAL(10,2),
    pb_ratio DECIMAL(10,2),
    dividend_yield DECIMAL(5,2),
    market_cap BIGINT,
    shares_outstanding BIGINT,
    listed_date DATE,
    is_warning_stock BOOLEAN DEFAULT FALSE,   -- 是否為注意股
    is_disposal_stock BOOLEAN DEFAULT FALSE,  -- 是否為處置股
    is_hidden_champion BOOLEAN DEFAULT FALSE, -- 是否為隱形冠軍
    is_leader BOOLEAN DEFAULT FALSE,          -- 是否為產業龍頭
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stocks_heat ON stocks(heat_score DESC);
CREATE INDEX idx_stocks_recommendation ON stocks(recommendation);
CREATE INDEX idx_stocks_vsis ON stocks((vsis_score->>'total')::int DESC);

-- ============================================================
-- 4. 龍頭生態系表
-- ============================================================
CREATE TABLE IF NOT EXISTS ecosystems (
    anchor_ticker VARCHAR(10) PRIMARY KEY REFERENCES stocks(ticker),
    anchor_name VARCHAR(100),
    anchor_english VARCHAR(100),
    anchor_type VARCHAR(50),       -- taiwan_leader / hidden_champion / global_giant
    industry VARCHAR(100),
    global_position TEXT,
    market_cap_ntd VARCHAR(50),
    current_price_range VARCHAR(50),
    key_description TEXT,
    customers JSONB,               -- 客戶陣列
    cloud_customers JSONB,         -- 雲端客戶（若適用）
    suppliers JSONB,               -- 供應商陣列
    competitors JSONB,             -- 競爭對手陣列
    downstream_partners JSONB,     -- 下游夥伴
    financial_projection JSONB,    -- 財務預估（2030 展望）
    taiwan_beneficiary_stocks JSONB, -- 台股受惠股陣列
    key_themes_2026 JSONB,         -- 2026 關鍵題材
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ecosystems_type ON ecosystems(anchor_type);

-- ============================================================
-- 5. 新聞表
-- ============================================================
CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,                  -- 全文（若有抓）
    source VARCHAR(100),
    url TEXT,
    published_at TIMESTAMP,
    crawled_at TIMESTAMP DEFAULT NOW(),
    ai_tags JSONB,                 -- AI 標籤
    related_industries JSONB,      -- 相關產業 ID
    related_topics JSONB,          -- 相關題材 ID
    related_stocks JSONB,          -- 相關個股 ticker
    ai_summary TEXT,               -- AI 摘要
    sentiment VARCHAR(20),         -- positive / negative / neutral
    importance INT DEFAULT 5,      -- 1-10
    catalyst_for_topic JSONB,      -- 作為某題材的催化劑
    is_processed BOOLEAN DEFAULT FALSE,  -- 是否已處理分類
    CONSTRAINT unique_news_url UNIQUE(url)
);

CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_news_importance ON news(importance DESC);
CREATE INDEX idx_news_stocks ON news USING gin(related_stocks);
CREATE INDEX idx_news_topics ON news USING gin(related_topics);
CREATE INDEX idx_news_processed ON news(is_processed);

-- ============================================================
-- 6. 資料源設定表
-- ============================================================
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    industry_id VARCHAR(50) REFERENCES industries(id),
    source_name VARCHAR(100),
    source_type VARCHAR(50),       -- crawler / api / rss
    url TEXT,
    keywords_filter JSONB,
    crawl_schedule VARCHAR(50),    -- daily_6am / every_2h / manual
    priority VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_crawled_at TIMESTAMP,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0
);

-- ============================================================
-- 7. 每日報告表
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    report_type VARCHAR(20) NOT NULL,  -- morning / precise / afternoon / weekend
    content TEXT NOT NULL,             -- Markdown 內容
    recommendations JSONB,             -- 結構化建議
    warnings JSONB,                    -- 警戒清單
    top_topics JSONB,                  -- 當日 TOP 題材
    ai_model VARCHAR(50),
    token_usage INT,
    generated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_daily_report UNIQUE(report_date, report_type)
);

CREATE INDEX idx_reports_date ON daily_reports(report_date DESC);

-- ============================================================
-- 8. 股價歷史表（時序資料）
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    date DATE NOT NULL,
    open DECIMAL(10,2),
    high DECIMAL(10,2),
    low DECIMAL(10,2),
    close DECIMAL(10,2),
    volume BIGINT,
    turnover BIGINT,
    CONSTRAINT unique_stock_price UNIQUE(ticker, date)
);

CREATE INDEX idx_prices_ticker_date ON stock_prices(ticker, date DESC);

-- ============================================================
-- 9. 法人買賣超
-- ============================================================
CREATE TABLE IF NOT EXISTS institutional_trading (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    date DATE NOT NULL,
    foreign_buy BIGINT,            -- 外資買超
    trust_buy BIGINT,              -- 投信買超
    dealer_buy BIGINT,             -- 自營商買超
    total_buy BIGINT,              -- 三大法人合計
    CONSTRAINT unique_institutional UNIQUE(ticker, date)
);

CREATE INDEX idx_institutional_date ON institutional_trading(date DESC, ticker);

-- ============================================================
-- 10. 月營收表
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_revenues (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    year INT NOT NULL,
    month INT NOT NULL,
    revenue BIGINT NOT NULL,
    mom_pct DECIMAL(8,2),          -- 月增率
    yoy_pct DECIMAL(8,2),          -- 年增率
    ytd_revenue BIGINT,            -- 累計營收
    ytd_yoy_pct DECIMAL(8,2),
    CONSTRAINT unique_monthly_revenue UNIQUE(ticker, year, month)
);

CREATE INDEX idx_monthly_rev_ticker ON monthly_revenues(ticker, year DESC, month DESC);

-- ============================================================
-- 11. 使用者自選股（預留商業化用）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_watchlists (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    added_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    target_price DECIMAL(10,2),
    stop_loss DECIMAL(10,2),
    CONSTRAINT unique_user_stock UNIQUE(user_id, ticker)
);

CREATE INDEX idx_watchlists_user ON user_watchlists(user_id);

-- ============================================================
-- 12. 使用者投資組合
-- ============================================================
CREATE TABLE IF NOT EXISTS user_portfolios (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    shares INT NOT NULL,
    avg_cost DECIMAL(10,2) NOT NULL,
    bought_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_portfolios_user ON user_portfolios(user_id);

-- ============================================================
-- 13. AI 對話歷史（預留多 user）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20),               -- user / assistant
    content TEXT,
    tokens_used INT,
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON ai_conversations(session_id, created_at);

-- ============================================================
-- 14. 系統日誌（爬蟲、排程）
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(50),           -- crawler / schedule / api_call / error
    source VARCHAR(100),
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_type_time ON system_logs(log_type, created_at DESC);

-- ============================================================
-- Trigger：自動更新 last_updated
-- ============================================================
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_industries_last_updated BEFORE UPDATE ON industries
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_topics_last_updated BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_stocks_last_updated BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_ecosystems_last_updated BEFORE UPDATE ON ecosystems
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- ============================================================
-- 查詢範例（常用 Query）
-- ============================================================

-- 取得 TOP 5 熱門題材
-- SELECT id, name, heat_score, heat_trend, ai_summary
-- FROM topics
-- WHERE status = 'active'
-- ORDER BY heat_score DESC
-- LIMIT 5;

-- 取得某題材的所有股票（依 tier 分組）
-- SELECT t.id, t.name, t.supply_chain
-- FROM topics t
-- WHERE t.id = 'ccl_price_increase_2026';

-- 取得某龍頭的完整生態系
-- SELECT e.*, s.name as anchor_name_from_stocks
-- FROM ecosystems e
-- LEFT JOIN stocks s ON e.anchor_ticker = s.ticker
-- WHERE e.anchor_ticker = '2330';

-- 取得今日焦點個股（熱度 + VSIS 排序）
-- SELECT ticker, name, heat_score, vsis_score, recommendation, daily_change_pct
-- FROM stocks
-- WHERE heat_score > 50 OR (vsis_score->>'total')::int > 70
-- ORDER BY heat_score DESC, (vsis_score->>'total')::int DESC
-- LIMIT 20;

-- 取得今日避開清單
-- SELECT ticker, name, consecutive_days, is_warning_stock, is_disposal_stock
-- FROM stocks
-- WHERE consecutive_days >= 5 OR is_warning_stock = TRUE OR is_disposal_stock = TRUE
-- ORDER BY consecutive_days DESC;

-- 取得近 7 天相關新聞
-- SELECT n.*
-- FROM news n
-- WHERE n.related_stocks @> '["2330"]'::jsonb
--   AND n.published_at >= NOW() - INTERVAL '7 days'
-- ORDER BY n.published_at DESC;

-- 計算題材熱度（定期執行）
-- UPDATE topics t
-- SET heat_score = (
--     SELECT LEAST(100,
--         -- 新聞熱度 (40%)
--         (SELECT COUNT(*) * 2 FROM news WHERE t.id = ANY(related_topics) AND published_at > NOW() - INTERVAL '3 days') +
--         -- 個股漲幅 (30%)
--         (SELECT AVG(daily_change_pct * 3) FROM stocks WHERE t.id = ANY(topic_ids)) +
--         -- 成交量放大 (20%)
--         (SELECT AVG(CASE WHEN volume_ma20 > 0 THEN (volume::float / volume_ma20 - 1) * 20 ELSE 0 END) FROM stocks WHERE t.id = ANY(topic_ids))
--     )
-- );

-- ============================================================
-- 結束
-- ============================================================
