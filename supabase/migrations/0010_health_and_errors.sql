-- ============================================
-- NEXT_TASK_008b 商業級地基:errors / source health / cross-market correlation
-- ============================================

-- =============== errors 表(Sentry 備案) ===============
-- 任何前端 / 後端錯誤寫進來,辦公室 /watchdog 顯示最近 100 條
CREATE TABLE IF NOT EXISTS errors (
  id           SERIAL PRIMARY KEY,
  trace_id     UUID DEFAULT gen_random_uuid(),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity     TEXT NOT NULL DEFAULT 'error',  -- info / warning / error / critical
  source       TEXT NOT NULL,                  -- backend / frontend / cron / crawler
  service      TEXT,                           -- 子系統:finmind / intel_crawler / quack_brain / ptt 等
  endpoint     TEXT,                           -- /api/xxx 或 frontend route
  message      TEXT NOT NULL,
  stacktrace   TEXT,
  context      JSONB DEFAULT '{}'::jsonb,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errors_occurred ON errors(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_severity ON errors(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_source ON errors(source, occurred_at DESC);

ALTER TABLE errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_errors" ON errors;
CREATE POLICY "read_errors" ON errors FOR SELECT USING (true);

-- =============== intel_sources 健康度欄位 ===============
ALTER TABLE intel_sources
  ADD COLUMN IF NOT EXISTS last_success_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_msg   TEXT,
  ADD COLUMN IF NOT EXISTS today_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS today_count_date DATE;

-- =============== us_tw_correlation 表(美股事件 → 台股族群連動) ===============
-- seed 資料:nvda 大漲 → ai server / 台積電 / 廣達; 費半大漲 → 台股半導體; tsm adr 跌 → 台積電跳空
CREATE TABLE IF NOT EXISTS us_tw_correlation (
  id                 SERIAL PRIMARY KEY,
  us_event_key       TEXT NOT NULL UNIQUE,        -- nvda_up_strong / sox_up / tsm_adr_down 等
  us_event_zh        TEXT NOT NULL,
  trigger_condition  TEXT NOT NULL,                -- 「NVDA 漲 > 3%」「費半漲 > 2%」等可讀條件
  impact_tw_sectors  JSONB DEFAULT '[]'::jsonb,    -- ["半導體", "AI 伺服器", "PCB"]
  impact_tw_stocks   JSONB DEFAULT '[]'::jsonb,    -- [{code:"2330",name:"台積電",direction:"up",strength:0.8}]
  correlation_score  NUMERIC(3,2) DEFAULT 0.5,     -- 0-1 連動強度
  historical_examples JSONB DEFAULT '[]'::jsonb,   -- 歷史案例文字陣列
  notes              TEXT,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_correlation_active ON us_tw_correlation(is_active, correlation_score DESC);

ALTER TABLE us_tw_correlation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_correlation" ON us_tw_correlation;
CREATE POLICY "read_correlation" ON us_tw_correlation FOR SELECT USING (true);

-- Seed 8 條核心連動規則
INSERT INTO us_tw_correlation
  (us_event_key, us_event_zh, trigger_condition, impact_tw_sectors, impact_tw_stocks, correlation_score, historical_examples, notes)
VALUES
  ('nvda_up_strong', 'NVDA 大漲', 'NVDA 收盤漲幅 > 3%',
    '["AI 伺服器","半導體","CCL","PCB","散熱"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"up","strength":0.8},
      {"code":"2382","name":"廣達","direction":"up","strength":0.85},
      {"code":"3231","name":"緯創","direction":"up","strength":0.8},
      {"code":"6669","name":"緯穎","direction":"up","strength":0.9},
      {"code":"3037","name":"欣興","direction":"up","strength":0.7},
      {"code":"3324","name":"雙鴻","direction":"up","strength":0.75}]'::jsonb,
    0.85,
    '["2025-01 NVDA 法說後 +5%,廣達/緯穎隔日跳空 +3-5%","2024-11 黃仁勳 GTC 後 NVDA +4%,台 AI 鏈普漲"]'::jsonb,
    'AI 主升段標準連動模式'),

  ('nvda_down_strong', 'NVDA 大跌', 'NVDA 收盤跌幅 > 3%',
    '["AI 伺服器","半導體","散熱"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"down","strength":0.6},
      {"code":"2382","name":"廣達","direction":"down","strength":0.85},
      {"code":"6669","name":"緯穎","direction":"down","strength":0.9}]'::jsonb,
    0.8,
    '["2024-08 NVDA 財報未達標 -7%,廣達/緯穎隔日 -4-5%"]'::jsonb,
    'AI 鏈跟跌通常比跟漲更劇烈'),

  ('sox_up', '費半大漲', 'SOX 收盤漲幅 > 2%',
    '["半導體","封測","IC 設計","記憶體"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"up","strength":0.7},
      {"code":"3711","name":"日月光投控","direction":"up","strength":0.65},
      {"code":"2454","name":"聯發科","direction":"up","strength":0.6},
      {"code":"6488","name":"環球晶","direction":"up","strength":0.6},
      {"code":"8028","name":"昇陽半導體","direction":"up","strength":0.55}]'::jsonb,
    0.75,
    '["2025-03 SOX +3.5%,台股半導體族群隔日普漲 1-2%"]'::jsonb,
    '費半是台股半導體領先指標'),

  ('sox_down', '費半大跌', 'SOX 收盤跌幅 > 2%',
    '["半導體","封測","IC 設計"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"down","strength":0.7},
      {"code":"3711","name":"日月光投控","direction":"down","strength":0.65}]'::jsonb,
    0.7,
    '["2024-10 SOX -3% 後台股半導體族群隔日 -1.5%"]'::jsonb,
    '通常台股跌幅較費半小,但會跟'),

  ('tsm_adr_down_strong', 'TSM ADR 大跌', 'TSM ADR 收盤跌幅 > 2%',
    '["半導體"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"down","strength":0.95}]'::jsonb,
    0.9,
    '["2025-02 TSM ADR -3% 隔日台積電跳空跌 -2.8%","ADR/正股價差通常 1 日內收斂"]'::jsonb,
    '台積電跟 TSM ADR 高度連動,ADR 是台積電開盤先行指標'),

  ('tsm_adr_up_strong', 'TSM ADR 大漲', 'TSM ADR 收盤漲幅 > 2%',
    '["半導體"]'::jsonb,
    '[{"code":"2330","name":"台積電","direction":"up","strength":0.95}]'::jsonb,
    0.9,
    '["2025-04 TSM ADR +4% 隔日台積電跳空 +3.5%"]'::jsonb,
    '台積電跟 TSM ADR 高度連動'),

  ('spx_up_strong', 'S&P 500 大漲', 'SPX 收盤漲幅 > 1.5%',
    '["大盤指數","電子權值股"]'::jsonb,
    '[]'::jsonb,
    0.55,
    '["美股大漲日台股加權通常開高 0.5-1%,但盤中常被外資調節"]'::jsonb,
    '外溢效應較弱,台股有自己節奏'),

  ('vix_spike', 'VIX 急漲(恐慌升溫)', 'VIX 收盤漲幅 > 15% 或 > 25',
    '["大盤指數","電子權值股","金融股"]'::jsonb,
    '[]'::jsonb,
    0.7,
    '["2024-08 VIX 從 16 → 38(+137%),台股次日 -3% 並開啟一週修正"]'::jsonb,
    '系統性風險訊號,台股通常跟跌且時間更久')
ON CONFLICT (us_event_key) DO UPDATE
  SET us_event_zh = EXCLUDED.us_event_zh,
      trigger_condition = EXCLUDED.trigger_condition,
      impact_tw_sectors = EXCLUDED.impact_tw_sectors,
      impact_tw_stocks = EXCLUDED.impact_tw_stocks,
      correlation_score = EXCLUDED.correlation_score,
      historical_examples = EXCLUDED.historical_examples,
      notes = EXCLUDED.notes,
      updated_at = NOW();
