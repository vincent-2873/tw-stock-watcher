-- Migration 0017: 使用者追蹤分析師(NEXT_TASK_009 階段 4)
--
-- 用途:使用者可在分析師個人頁按「追蹤」,加入個人關注名單
-- 依賴:0016(user_profiles)

CREATE TABLE IF NOT EXISTS user_followed_analysts (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_user_followed_user ON user_followed_analysts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_followed_agent ON user_followed_analysts(agent_id);

-- RLS:每個使用者只看到自己的追蹤
ALTER TABLE user_followed_analysts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own follows" ON user_followed_analysts;
CREATE POLICY "users can read own follows"
    ON user_followed_analysts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can insert own follows" ON user_followed_analysts;
CREATE POLICY "users can insert own follows"
    ON user_followed_analysts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can delete own follows" ON user_followed_analysts;
CREATE POLICY "users can delete own follows"
    ON user_followed_analysts FOR DELETE
    USING (auth.uid() = user_id);
