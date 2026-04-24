-- ============================================================================
-- Migration 0008: Seed 首場示範會議 + 5 位分析師預測
--
-- 目的:
--   讓 /meetings 和 /predictions 頁不是空殼。
--   這是「示範資料」—— Vincent 驗收真實會議系統前先有東西可看。
--
-- 資料內容:
--   - 1 場盤前會議(2026-04-25 08:00 TPE)
--   - 5 筆預測(阿武/阿慧/阿跡/阿數/阿和 各一)
--   - 時限 2026-05-02(下週五)收盤
--   - 使用 2026-04-24 實際收盤價為起始價
-- ============================================================================

BEGIN;

-- 首場示範會議
INSERT INTO meetings (
  meeting_id, meeting_type, scheduled_at, started_at, ended_at,
  chair_agent_id, attendees, content_markdown,
  predictions_created, predictions_settled, created_at
) VALUES (
  'MEET-2026-0425-0800',
  'pre_market',
  '2026-04-25T08:00:00+08:00',
  '2026-04-25T08:00:00+08:00',
  '2026-04-25T08:45:00+08:00',
  'guagua',
  '["guagua","owl_fundamentalist","hedgehog_technical","squirrel_chip","meerkat_quant","fox_skeptic","pangolin_risk","analyst_a","analyst_b","analyst_c","analyst_d","analyst_e"]'::jsonb,
  E'═══════════════════════════════════════\n📋 呱呱投資招待所 研究部 會議記錄\n═══════════════════════════════════════\n\n會議名稱:2026-04-25(週六)首場示範盤前會議\n會議時間:2026-04-25 08:00 ~ 08:45(台北時間)\n主席:呱呱 🦆\n\n【一、盤前重點】\n- 2026-04-24 台積電收 2,185 元(+5.05%),外資大買 830 萬股\n- 費半 +3.88%,美股樂觀\n- 注意:單日急漲後短線回檔壓力\n\n【二、各部門情報摘要】\n🦉 評級師:台積電 Q1 毛利 53% 持穩,長線看好\n📊 技術分析師:2330 突破月線 + 量能配合\n📡 籌碼觀察家:外資連買 5 日,投信同步\n🧑‍🔬 量化科學家:歷史回測勝率 68% (N=47,偏低)\n\n【三、投資部門預測】(詳見 predictions 表)\n\n【四、質疑官拷問】\n🦊:阿武 75% 信心會不會太高?如果法說會出包?\n阿武:停損設 2000,我認\n\n【五、風險提示】\n🧘:本週重大事件 Fed/CPI,建議單一標的上限 30%,動態停損\n\n【六、呱呱總結】\n吶,阿武看技術、阿慧看基本面、阿跡盯籌碼、阿數算勝率、阿和折衷 ——\n五位看法各有差異,但都鎖定台股半導體旗艦股。\n\n本場為示範會議,首次跑完整流程。下週起 cron 自動跑 07:30/08:00/12:00/14:00。\n\n═══════════════════════════════════════\nMeeting ID: MEET-2026-0425-0800',
  '["PRED-2026-0425-A01","PRED-2026-0425-B01","PRED-2026-0425-C01","PRED-2026-0425-D01","PRED-2026-0425-E01"]'::jsonb,
  '[]'::jsonb,
  NOW()
) ON CONFLICT (meeting_id) DO NOTHING;


-- 5 筆預測(阿武/阿慧/阿跡/阿數/阿和 各一)
-- 用 quack_predictions 擴充 schema
INSERT INTO quack_predictions (
  date, prediction_type, subject, prediction, confidence, timeframe, evaluate_after,
  agent_id, agent_name, target_symbol, target_name, direction,
  target_price, current_price_at_prediction, deadline,
  reasoning, success_criteria, supporting_departments, status, meeting_id
) VALUES
-- 阿武 A (技術派):2330 台積電 看多
('2026-04-25', 'stock_pick', '2330', '2330 台積電,短線看 2280',
 80, '1w', '2026-05-02',
 'analyst_a', '阿武', '2330', '台積電', 'bullish',
 2280, 2185, '2026-05-02T13:30:00+08:00',
 '技術突破月線 + 外資連買 5 日 3.2 萬張 + 量能配合',
 '收盤價達到或超過 2280(嚴格)',
 '["technical","chip"]'::jsonb, 'active', 'MEET-2026-0425-0800'),

-- 阿慧 B (基本面派):2454 聯發科 看多
('2026-04-25', 'stock_pick', '2454', '2454 聯發科,中長線看 1650',
 65, '1m', '2026-05-25',
 'analyst_b', '阿慧', '2454', '聯發科', 'bullish',
 1650, 1510, '2026-05-25T13:30:00+08:00',
 'AI 晶片營收年增 45%,毛利率擴張。一個月內看 1650',
 '時限內最高點達 1650 即命中(寬鬆看最高點)',
 '["fundamental","quant"]'::jsonb, 'active', 'MEET-2026-0425-0800'),

-- 阿跡 C (籌碼派):2317 鴻海 看多
('2026-04-25', 'stock_pick', '2317', '2317 鴻海,2 週看 200',
 70, '2w', '2026-05-09',
 'analyst_c', '阿跡', '2317', '鴻海', 'bullish',
 200, 187, '2026-05-09T13:30:00+08:00',
 '外資連買 4 日,分點大戶默默墊高。主力腳印明顯',
 '方向對且達目標 80% = 半命中(寬鬆)',
 '["chip","technical"]'::jsonb, 'active', 'MEET-2026-0425-0800'),

-- 阿數 D (量化派):3231 緯創 看空(reversal play)
('2026-04-25', 'stock_pick', '3231', '3231 緯創,空頭訊號',
 58, '1w', '2026-05-02',
 'analyst_d', '阿數', '3231', '緯創', 'bearish',
 130, 142, '2026-05-02T13:30:00+08:00',
 'RSI 超買 + 融資爆增 + 歷史回測這組合 N=112 勝率 62%',
 '實際報酬率達預測 90% 為命中(數學判定)',
 '["quant","chip"]'::jsonb, 'active', 'MEET-2026-0425-0800'),

-- 阿和 E (綜合派):2382 廣達 看多
('2026-04-25', 'stock_pick', '2382', '2382 廣達,分段目標',
 68, '1m', '2026-05-25',
 'analyst_e', '阿和', '2382', '廣達', 'bullish',
 350, 328, '2026-05-25T13:30:00+08:00',
 '四派訊號:技術中性 / 基本面偏多 / 籌碼偏多 / 量化持平。平均為溫和看多',
 '分段:1/3 時限達 33%目標=1/3 命中,2/3 達 66%=2/3 命中,時限達 100%=完全命中',
 '["technical","fundamental","chip","quant"]'::jsonb, 'active', 'MEET-2026-0425-0800')
ON CONFLICT DO NOTHING;


-- 更新 agent_stats 的 total_predictions 欄位(只加 1 給 5 位投資分析師)
UPDATE agent_stats SET total_predictions = total_predictions + 1, last_updated = NOW()
  WHERE agent_id IN ('analyst_a','analyst_b','analyst_c','analyst_d','analyst_e');

COMMIT;

-- 驗證:
--   SELECT count(*) FROM meetings;         → 1
--   SELECT count(*) FROM quack_predictions WHERE status='active'; → 5
--   SELECT agent_id, total_predictions FROM agent_stats WHERE agent_id LIKE 'analyst_%';
