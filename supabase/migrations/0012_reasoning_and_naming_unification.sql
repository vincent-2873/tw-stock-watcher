-- ============================================
-- NEXT_TASK_008c-cleanup
-- (1) reasoning 欄位獨立(從 evidence JSONB 拉出)
-- (2) 5 位分析師舊名(阿武/阿慧/阿跡/阿數/阿和) → 新名(辰旭/靜遠/觀棋/守拙/明川)
-- ============================================

-- =============== Part A: reasoning 欄位獨立 ===============
ALTER TABLE quack_predictions ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- 從 evidence JSONB 把 reasoning 搬到獨立欄位
UPDATE quack_predictions
SET reasoning = evidence->>'reasoning'
WHERE reasoning IS NULL
  AND evidence IS NOT NULL
  AND evidence ? 'reasoning';

CREATE INDEX IF NOT EXISTS idx_qp_reasoning_notnull
  ON quack_predictions(id) WHERE reasoning IS NOT NULL;


-- =============== Part B: agent_stats 命名統一 ===============
-- 對照表:
--   analyst_a (阿武/Takeshi)  → 辰旭 (Chénxù)   技術派
--   analyst_b (阿慧/Satomi)   → 靜遠 (Jìngyuǎn) 基本面派
--   analyst_c (阿跡/Ato)      → 觀棋 (Guānqí)   籌碼派
--   analyst_d (阿數/Kazu)     → 守拙 (Shǒuzhuō) 量化派
--   analyst_e (阿和/Yawa)     → 明川 (Míngchuān) 綜合派

UPDATE agent_stats SET
  display_name = '辰旭',
  agent_name = '辰旭'
WHERE agent_id = 'analyst_a';

UPDATE agent_stats SET
  display_name = '靜遠',
  agent_name = '靜遠'
WHERE agent_id = 'analyst_b';

UPDATE agent_stats SET
  display_name = '觀棋',
  agent_name = '觀棋'
WHERE agent_id = 'analyst_c';

UPDATE agent_stats SET
  display_name = '守拙',
  agent_name = '守拙'
WHERE agent_id = 'analyst_d';

UPDATE agent_stats SET
  display_name = '明川',
  agent_name = '明川'
WHERE agent_id = 'analyst_e';


-- =============== Part C: quack_predictions agent_name 命名統一 ===============
UPDATE quack_predictions SET agent_name = '辰旭' WHERE agent_id = 'analyst_a' AND agent_name IN ('阿武', '投資分析師 A');
UPDATE quack_predictions SET agent_name = '靜遠' WHERE agent_id = 'analyst_b' AND agent_name IN ('阿慧', '投資分析師 B');
UPDATE quack_predictions SET agent_name = '觀棋' WHERE agent_id = 'analyst_c' AND agent_name IN ('阿跡', '投資分析師 C');
UPDATE quack_predictions SET agent_name = '守拙' WHERE agent_id = 'analyst_d' AND agent_name IN ('阿數', '投資分析師 D');
UPDATE quack_predictions SET agent_name = '明川' WHERE agent_id = 'analyst_e' AND agent_name IN ('阿和', '投資分析師 E');


-- =============== Part D: meetings.content_markdown 替換舊名 ===============
-- 戰情室會議記錄含 5 位互稱(阿武看技術、阿慧的擔心也有道理 等)
UPDATE meetings SET content_markdown =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(content_markdown, '阿武', '辰旭'),
          '阿慧', '靜遠'),
        '阿跡', '觀棋'),
      '阿數', '守拙'),
    '阿和', '明川')
WHERE content_markdown ~ '阿武|阿慧|阿跡|阿數|阿和';


-- =============== Part E: quack_predictions.prediction 文字替換 ===============
-- prediction 欄位有「{symbol} {name}, direction 目標 {price} | 理由:{reasoning}」格式
-- 雖然 reasoning 內各分析師 prompt 通常不含其他人名,但保險起見替換
UPDATE quack_predictions SET prediction =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(prediction, '阿武', '辰旭'),
          '阿慧', '靜遠'),
        '阿跡', '觀棋'),
      '阿數', '守拙'),
    '阿和', '明川')
WHERE prediction IS NOT NULL AND prediction ~ '阿武|阿慧|阿跡|阿數|阿和';


-- =============== Part F: quack_predictions.reasoning 替換(剛從 evidence 拉出) ===============
UPDATE quack_predictions SET reasoning =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(reasoning, '阿武', '辰旭'),
          '阿慧', '靜遠'),
        '阿跡', '觀棋'),
      '阿數', '守拙'),
    '阿和', '明川')
WHERE reasoning IS NOT NULL AND reasoning ~ '阿武|阿慧|阿跡|阿數|阿和';


-- =============== Part G: analyst_market_views / analyst_daily_picks(保險起見) ===============
UPDATE analyst_market_views SET market_view =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(market_view, '阿武', '辰旭'),
          '阿慧', '靜遠'),
        '阿跡', '觀棋'),
      '阿數', '守拙'),
    '阿和', '明川')
WHERE market_view ~ '阿武|阿慧|阿跡|阿數|阿和';

UPDATE analyst_daily_picks SET reason =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(reason, '阿武', '辰旭'),
          '阿慧', '靜遠'),
        '阿跡', '觀棋'),
      '阿數', '守拙'),
    '阿和', '明川')
WHERE reason ~ '阿武|阿慧|阿跡|阿數|阿和';
