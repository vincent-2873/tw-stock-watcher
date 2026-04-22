-- ============================================
-- Vincent Stock Intelligence System
-- Supabase PostgreSQL Schema
-- ============================================
-- 執行方法:在 Supabase SQL Editor 貼上執行
-- ============================================

-- ==========================================
-- 股票基本資料
-- ==========================================
CREATE TABLE IF NOT EXISTS stocks (
    stock_id VARCHAR(10) PRIMARY KEY,
    stock_name VARCHAR(100) NOT NULL,
    market VARCHAR(20) NOT NULL,  -- 'TW', 'US', 'OTC'
    industry VARCHAR(100),
    sub_industry VARCHAR(100),
    listing_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_alert_stock BOOLEAN DEFAULT FALSE,
    is_full_delivery BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stocks_industry ON stocks(industry);
CREATE INDEX idx_stocks_market ON stocks(market);

-- ==========================================
-- 每日股價(快取)
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_prices (
    id BIGSERIAL PRIMARY KEY,
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    trade_date DATE NOT NULL,
    open NUMERIC(10, 2),
    high NUMERIC(10, 2),
    low NUMERIC(10, 2),
    close NUMERIC(10, 2),
    volume BIGINT,
    amount BIGINT,
    change_pct NUMERIC(6, 2),
    adjusted_close NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_date)
);

CREATE INDEX idx_daily_prices_stock_date ON daily_prices(stock_id, trade_date DESC);

-- ==========================================
-- 法人買賣超
-- ==========================================
CREATE TABLE IF NOT EXISTS institutional_investors (
    id BIGSERIAL PRIMARY KEY,
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    trade_date DATE NOT NULL,
    foreign_buy BIGINT DEFAULT 0,
    foreign_sell BIGINT DEFAULT 0,
    foreign_net BIGINT GENERATED ALWAYS AS (foreign_buy - foreign_sell) STORED,
    
    investment_trust_buy BIGINT DEFAULT 0,
    investment_trust_sell BIGINT DEFAULT 0,
    investment_trust_net BIGINT GENERATED ALWAYS AS (investment_trust_buy - investment_trust_sell) STORED,
    
    dealer_buy BIGINT DEFAULT 0,
    dealer_sell BIGINT DEFAULT 0,
    dealer_net BIGINT GENERATED ALWAYS AS (dealer_buy - dealer_sell) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_date)
);

CREATE INDEX idx_institutional_stock_date ON institutional_investors(stock_id, trade_date DESC);

-- ==========================================
-- 使用者自選股
-- ==========================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL DEFAULT 'vincent',
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    
    cost_price NUMERIC(10, 2),      -- 成本價(選填)
    cost_quantity INT DEFAULT 0,    -- 持有張數
    target_price NUMERIC(10, 2),    -- 目標價
    stop_loss_price NUMERIC(10, 2), -- 停損價
    
    notes TEXT,
    tags TEXT[],
    
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, stock_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- ==========================================
-- AI 推薦紀錄(核心表格!追溯用)
-- ==========================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    
    -- 推薦結論
    recommendation_type VARCHAR(20) NOT NULL,  -- 'strong_buy', 'buy', 'watch', 'hold', 'avoid'
    confidence INT CHECK (confidence >= 0 AND confidence <= 100),
    total_score INT,
    
    -- 四象限評分
    fundamental_score INT,
    chip_score INT,
    technical_score INT,
    catalyst_score INT,
    market_adjustment INT,
    
    -- 完整 evidence(JSON)
    evidence JSONB NOT NULL,
    bull_case JSONB,
    bear_case JSONB,
    action_plan JSONB,
    monitoring_signals JSONB,
    
    -- 當時資料快照
    data_snapshot JSONB NOT NULL,
    
    -- 追蹤
    follow_up_7d BOOLEAN DEFAULT FALSE,
    follow_up_30d BOOLEAN DEFAULT FALSE,
    follow_up_90d BOOLEAN DEFAULT FALSE,
    
    price_at_recommendation NUMERIC(10, 2),
    price_7d_later NUMERIC(10, 2),
    price_30d_later NUMERIC(10, 2),
    price_90d_later NUMERIC(10, 2),
    
    return_7d NUMERIC(6, 2),
    return_30d NUMERIC(6, 2),
    return_90d NUMERIC(6, 2),
    
    -- 使用者反應
    user_action VARCHAR(20),  -- 'followed', 'rejected', 'ignored'
    user_notes TEXT,
    
    -- 是否準確(系統自動判定)
    is_accurate BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_stock_date ON recommendations(stock_id, recommendation_date DESC);
CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_recommendations_pending_followup ON recommendations(follow_up_7d, follow_up_30d, follow_up_90d)
    WHERE follow_up_7d = FALSE OR follow_up_30d = FALSE OR follow_up_90d = FALSE;

-- ==========================================
-- 警報紀錄
-- ==========================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    
    alert_type VARCHAR(50) NOT NULL,  -- 'VOLUME', 'PRICE', 'NEWS', 'CHIP', 'SYSTEM'
    severity VARCHAR(20) NOT NULL,    -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    sent_via VARCHAR(50)[],  -- ['line', 'email', 'web']
    
    -- 追蹤有效性
    is_handled BOOLEAN DEFAULT FALSE,
    handled_at TIMESTAMPTZ,
    user_response VARCHAR(50),  -- 'acted', 'dismissed', 'ignored'
    
    -- 事後分析
    effectiveness_score INT,  -- 0-10,系統自動評估
    price_30min_after NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_time ON alerts(user_id, triggered_at DESC);
CREATE INDEX idx_alerts_unhandled ON alerts(is_handled) WHERE is_handled = FALSE;

-- ==========================================
-- 每日報告
-- ==========================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,  -- 'morning', 'day_trade', 'closing', 'us_market'
    report_date DATE NOT NULL,
    
    title VARCHAR(200),
    content_short TEXT,  -- LINE 推播版(精簡)
    content_full JSONB,  -- 網頁完整版
    
    sent_to_line BOOLEAN DEFAULT FALSE,
    sent_to_email BOOLEAN DEFAULT FALSE,
    
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_type, report_date)
);

CREATE INDEX idx_reports_type_date ON reports(report_type, report_date DESC);

-- ==========================================
-- 當沖推薦(獨立表格,因為時效性強)
-- ==========================================
CREATE TABLE IF NOT EXISTS day_trade_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_date DATE NOT NULL,
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    rank INT,
    
    strategy_type VARCHAR(50),  -- 'breakout', 'pullback', 'volume_surge', 'end_of_day'
    confidence INT,
    
    entry_signals JSONB,  -- 進場條件
    stop_loss_price NUMERIC(10, 2),
    take_profit_1 NUMERIC(10, 2),
    take_profit_2 NUMERIC(10, 2),
    take_profit_3 NUMERIC(10, 2),
    time_stop TIME,  -- 時間停損(例:11:00)
    
    bull_reasons TEXT[],
    bear_reasons TEXT[],
    
    risk_level VARCHAR(20),  -- 'low', 'medium', 'high', 'very_high'
    
    -- 盤後自動填入結果
    intraday_high NUMERIC(10, 2),
    intraday_low NUMERIC(10, 2),
    closed_price NUMERIC(10, 2),
    hit_stop_loss BOOLEAN,
    hit_tp1 BOOLEAN,
    hit_tp2 BOOLEAN,
    hit_tp3 BOOLEAN,
    theoretical_pnl NUMERIC(10, 2),  -- 理論獲利
    
    -- 使用者實際操作
    user_executed BOOLEAN DEFAULT FALSE,
    actual_pnl NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_day_trade_date ON day_trade_picks(pick_date DESC);

-- ==========================================
-- 新聞快取
-- ==========================================
CREATE TABLE IF NOT EXISTS news_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100),
    category VARCHAR(50),
    
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE,
    published_at TIMESTAMPTZ,
    
    -- AI 分析結果
    sentiment VARCHAR(20),  -- 'positive', 'neutral', 'negative'
    sentiment_score INT,    -- -100 to 100
    topics TEXT[],
    related_stocks VARCHAR(10)[],
    importance INT,  -- 1-10
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_published ON news_cache(published_at DESC);
CREATE INDEX idx_news_stocks ON news_cache USING GIN(related_stocks);
CREATE INDEX idx_news_topics ON news_cache USING GIN(topics);

-- ==========================================
-- 使用者操作紀錄(學習用)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    
    action_type VARCHAR(50) NOT NULL,  -- 'followed_rec', 'rejected_rec', 'added_watchlist', 'executed_trade'
    related_id UUID,  -- 對應的 recommendation_id 或 alert_id
    
    stock_id VARCHAR(10),
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user_time ON user_actions(user_id, created_at DESC);

-- ==========================================
-- 系統健康度紀錄
-- ==========================================
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    
    service_name VARCHAR(50),
    status VARCHAR(20),  -- 'healthy', 'degraded', 'down'
    response_time_ms INT,
    error_message TEXT,
    
    metadata JSONB
);

CREATE INDEX idx_system_health_time ON system_health(checked_at DESC);

-- ==========================================
-- 系統設定(Vincent 的個人偏好)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(50) PRIMARY KEY DEFAULT 'vincent',
    
    -- 資金設定
    total_capital NUMERIC(12, 2) DEFAULT 1000000,
    max_risk_per_trade_pct NUMERIC(4, 2) DEFAULT 2.0,
    max_position_pct NUMERIC(4, 2) DEFAULT 10.0,
    
    -- 通知設定
    notify_morning BOOLEAN DEFAULT TRUE,
    notify_day_trade BOOLEAN DEFAULT TRUE,
    notify_intraday BOOLEAN DEFAULT TRUE,
    notify_closing BOOLEAN DEFAULT TRUE,
    notify_us_market BOOLEAN DEFAULT FALSE,
    
    notify_levels TEXT[] DEFAULT ARRAY['CRITICAL', 'HIGH', 'MEDIUM'],
    quiet_hours JSONB DEFAULT '[]',  -- [{"start": "12:00", "end": "12:30"}]
    
    -- 偏好
    preferred_markets TEXT[] DEFAULT ARRAY['TW'],
    preferred_industries TEXT[] DEFAULT ARRAY['AI', '半導體', '記憶體'],
    excluded_industries TEXT[] DEFAULT ARRAY['生技'],
    
    investment_style JSONB DEFAULT '{"swing": 70, "day_trade": 20, "long_term": 10}',
    risk_preference VARCHAR(20) DEFAULT 'moderate',  -- 'conservative', 'moderate', 'aggressive'
    
    -- LINE 綁定
    line_user_id VARCHAR(100),
    line_bound_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 初始資料
-- ==========================================
INSERT INTO user_settings (user_id) VALUES ('vincent')
ON CONFLICT (user_id) DO NOTHING;

-- 常用股票預填
INSERT INTO stocks (stock_id, stock_name, market, industry) VALUES
    ('2317', '鴻海', 'TW', '電子零組件'),
    ('2330', '台積電', 'TW', '半導體'),
    ('2454', '聯發科', 'TW', '半導體'),
    ('2308', '台達電', 'TW', '電子零組件'),
    ('2303', '聯電', 'TW', '半導體'),
    ('2344', '華邦電', 'TW', '半導體'),
    ('2379', '瑞昱', 'TW', '半導體'),
    ('2382', '廣達', 'TW', '電腦系統'),
    ('3231', '緯創', 'TW', '電腦系統'),
    ('6139', '亞翔', 'TW', '其他電子')
ON CONFLICT (stock_id) DO NOTHING;

-- ==========================================
-- Row Level Security(RLS)
-- ==========================================
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 單一使用者(Vincent)先用最寬鬆的 policy
CREATE POLICY "Allow all for service role" ON watchlist
    FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON alerts
    FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON user_actions
    FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON user_settings
    FOR ALL USING (true);

-- ==========================================
-- 完成
-- ==========================================
-- 執行完後,你應該看到:
-- - 12 個表格
-- - 多個 indexes
-- - 基本資料已預填
-- ==========================================


-- ============================================
-- 進階表格(spec 16-24 需要)
-- 補上所有 specs 中定義但主 schema 沒有的表
-- ============================================

-- spec 16: 重要事件日曆(法說會/財報/除權/處置股/FOMC 等)
CREATE TABLE IF NOT EXISTS scheduled_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_time_tpe TIMESTAMPTZ,
    event_time_et TIMESTAMPTZ,
    stock_id VARCHAR(10),
    stock_name VARCHAR(100),
    market VARCHAR(20),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    details JSONB,
    estimated_impact INT,
    affects_stocks TEXT[],
    source_url TEXT,
    source_verified_at TIMESTAMPTZ,
    remind_days_before INT[],
    reminded_at TIMESTAMPTZ[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_date ON scheduled_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_stock ON scheduled_events(stock_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON scheduled_events(event_type);


-- spec 15: 使用者實際交易紀錄
CREATE TABLE IF NOT EXISTS user_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    stock_id VARCHAR(10),
    action VARCHAR(10),
    quantity INT,
    price NUMERIC(10, 2),
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    exit_price NUMERIC(10, 2),
    stop_loss_price NUMERIC(10, 2),
    take_profit_prices NUMERIC[],
    recommendation_id UUID REFERENCES recommendations(id),
    pnl NUMERIC(12, 2),
    pnl_pct NUMERIC(6, 2),
    status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_trades_user ON user_trades(user_id, created_at DESC);


-- spec 15: 跨市場資料
CREATE TABLE IF NOT EXISTS cross_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    market_close_time TIMESTAMPTZ,
    dji_close NUMERIC(10, 2),
    dji_change_pct NUMERIC(6, 2),
    nasdaq_close NUMERIC(10, 2),
    nasdaq_change_pct NUMERIC(6, 2),
    sox_close NUMERIC(10, 2),
    sox_change_pct NUMERIC(6, 2),
    sp500_close NUMERIC(10, 2),
    sp500_change_pct NUMERIC(6, 2),
    tsm_adr_close NUMERIC(10, 2),
    tsm_adr_change_pct NUMERIC(6, 2),
    nvda_close NUMERIC(10, 2),
    nvda_change_pct NUMERIC(6, 2),
    aapl_close NUMERIC(10, 2),
    aapl_change_pct NUMERIC(6, 2),
    taiex_futures_night_close NUMERIC(10, 2),
    taiex_futures_night_change NUMERIC(10, 2),
    predicted_taiex_open NUMERIC(10, 2),
    predicted_tsmc_open NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);


-- spec 14: 供應鏈關係
CREATE TABLE IF NOT EXISTS supply_chain_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_stock_id VARCHAR(10),
    supplier_name VARCHAR(100),
    customer_stock_id VARCHAR(10),
    customer_name VARCHAR(100),
    product_category VARCHAR(100),
    relationship_type VARCHAR(50),
    revenue_share_estimate NUMERIC(5, 2),
    confidence INT,
    source_type VARCHAR(50),
    source_url TEXT,
    source_date DATE,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_supplier ON supply_chain_relationships(supplier_stock_id);
CREATE INDEX IF NOT EXISTS idx_supply_customer ON supply_chain_relationships(customer_stock_id);


-- spec 13: 飆股雷達每日掃描結果
CREATE TABLE IF NOT EXISTS screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL,
    scan_time TIMESTAMPTZ NOT NULL,
    stock_id VARCHAR(10) REFERENCES stocks(stock_id),
    strategies TEXT[],
    strategies_count INT,
    combined_score INT,
    strategy_details JSONB,
    ai_summary TEXT,
    ai_score INT,
    price_at_pick NUMERIC(10, 2),
    price_1d NUMERIC(10, 2),
    price_7d NUMERIC(10, 2),
    price_30d NUMERIC(10, 2),
    became_hot_stock BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_screening_date ON screening_results(scan_date DESC);


-- spec 18: 對話學習 - 對話討論串
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    topic_type VARCHAR(50),
    stock_id VARCHAR(10),
    topic_title VARCHAR(200),
    messages JSONB,
    insights_learned TEXT[],
    preferences_updated JSONB,
    actions_taken JSONB,
    message_count INT,
    started_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_threads_stock ON conversation_threads(stock_id);
CREATE INDEX IF NOT EXISTS idx_threads_recent ON conversation_threads(last_message_at DESC);


-- spec 18: Vincent 教 AI 的洞察銀行
CREATE TABLE IF NOT EXISTS vincent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight TEXT NOT NULL,
    category VARCHAR(50),
    source_conversation_id UUID,
    source_stock_id VARCHAR(10),
    is_tested BOOLEAN DEFAULT FALSE,
    test_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    success_rate NUMERIC(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    weight_in_decision NUMERIC(5, 2) DEFAULT 5.0,
    first_suggested_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- spec 19: AI 質疑記錄
CREATE TABLE IF NOT EXISTS ai_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50),
    challenge_level INT,
    challenge_reason TEXT,
    challenge_category VARCHAR(50),
    user_message TEXT,
    planned_action JSONB,
    user_response TEXT,
    user_changed_decision BOOLEAN,
    user_final_action JSONB,
    outcome_tracked_at TIMESTAMPTZ,
    outcome_result VARCHAR(50),
    outcome_pnl NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- spec 20: 回測執行紀錄
CREATE TABLE IF NOT EXISTS backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    strategy VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital NUMERIC(12, 2),
    final_capital NUMERIC(12, 2),
    total_return_pct NUMERIC(6, 2),
    annualized_return_pct NUMERIC(6, 2),
    max_drawdown_pct NUMERIC(6, 2),
    sharpe_ratio NUMERIC(6, 2),
    win_rate_pct NUMERIC(5, 2),
    total_trades INT,
    metrics JSONB,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- spec 20: 模擬交易帳戶
CREATE TABLE IF NOT EXISTS paper_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    account_name VARCHAR(100),
    initial_capital NUMERIC(12, 2) DEFAULT 1000000,
    current_cash NUMERIC(12, 2),
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    total_pnl NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- spec 20: 模擬交易紀錄
CREATE TABLE IF NOT EXISTS paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES paper_accounts(id),
    stock_id VARCHAR(10),
    action VARCHAR(10),
    quantity INT,
    entry_price NUMERIC(10, 2),
    entry_time TIMESTAMPTZ,
    exit_price NUMERIC(10, 2),
    exit_time TIMESTAMPTZ,
    stop_loss NUMERIC(10, 2),
    take_profit NUMERIC(10, 2),
    from_recommendation_id UUID,
    pnl NUMERIC(12, 2),
    pnl_pct NUMERIC(6, 2),
    fees NUMERIC(10, 2),
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paper_trades_account ON paper_trades(account_id, created_at DESC);


-- spec 24: 使用者錯誤回報
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    related_type VARCHAR(50),
    related_id UUID,
    feedback_type VARCHAR(50),
    rating INT,
    reasons TEXT[],
    comment TEXT,
    metadata JSONB,
    ai_analysis TEXT,
    is_addressed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON user_feedback(user_id, created_at DESC);


-- ============================================
-- 最終確認
-- ============================================
-- 執行完後,你應該看到:
-- - 23 個表格(原 12 + 新增 11)
-- - 完整索引
-- ============================================
