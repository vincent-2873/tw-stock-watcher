-- ============================================================================
-- Migration 0007: agent_stats 加上日式代號、顯示名、tracked 欄位
--
-- 依據: 5 位投資分析師人設定案 (阿武/阿慧/阿跡/阿數/阿和)
-- ============================================================================

BEGIN;

-- 新欄位
ALTER TABLE agent_stats
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS role         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emoji        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tracked      BOOLEAN DEFAULT false;

-- 更新 12 個 agent 的顯示資料
-- 所主
UPDATE agent_stats SET display_name='呱呱', role='所主', emoji='🦆', tracked=true
  WHERE agent_id='guagua';

-- 資訊生產層(4 部門主管,產情報不做預測)
UPDATE agent_stats SET display_name='評級師', role='基本面部門主管', emoji='🦉', tracked=false
  WHERE agent_id='owl_fundamentalist';
UPDATE agent_stats SET display_name='技術分析師', role='技術面部門主管', emoji='📊', tracked=false
  WHERE agent_id='hedgehog_technical';
UPDATE agent_stats SET display_name='籌碼觀察家', role='籌碼面部門主管', emoji='📡', tracked=false
  WHERE agent_id='squirrel_chip';
UPDATE agent_stats SET display_name='量化科學家', role='量化部門主管', emoji='🧑‍🔬', tracked=false
  WHERE agent_id='meerkat_quant';

-- 監督學習層
UPDATE agent_stats SET display_name='質疑官', role='逆向部門主管', emoji='🦊', tracked=false
  WHERE agent_id='fox_skeptic';
UPDATE agent_stats SET display_name='風險管理師', role='風控部門主管', emoji='🧘', tracked=false
  WHERE agent_id='pangolin_risk';

-- 投資部門 5 位 (日式代號)
UPDATE agent_stats SET display_name='阿武',  role='投資分析師 · 技術派',   emoji='⚔️', tracked=true
  WHERE agent_id='analyst_a';
UPDATE agent_stats SET display_name='阿慧',  role='投資分析師 · 基本面派', emoji='📚', tracked=true
  WHERE agent_id='analyst_b';
UPDATE agent_stats SET display_name='阿跡',  role='投資分析師 · 籌碼派',   emoji='🔍', tracked=true
  WHERE agent_id='analyst_c';
UPDATE agent_stats SET display_name='阿數',  role='投資分析師 · 量化派',   emoji='🧮', tracked=true
  WHERE agent_id='analyst_d';
UPDATE agent_stats SET display_name='阿和',  role='投資分析師 · 綜合派',   emoji='☯️', tracked=true
  WHERE agent_id='analyst_e';

-- 補全 agent_name 中文名
UPDATE agent_stats SET agent_name='呱呱(所主)'           WHERE agent_id='guagua' AND agent_name IS NULL;
-- (原本 seed 已有 agent_name,這邊為防 NULL)

COMMIT;

-- 驗證:
--   SELECT agent_id, display_name, role, emoji, tracked FROM agent_stats ORDER BY
--     CASE
--       WHEN agent_id='guagua' THEN 0
--       WHEN agent_id LIKE 'analyst_%' THEN 1
--       WHEN agent_id IN ('owl_fundamentalist','hedgehog_technical','squirrel_chip','meerkat_quant') THEN 2
--       ELSE 3
--     END;
