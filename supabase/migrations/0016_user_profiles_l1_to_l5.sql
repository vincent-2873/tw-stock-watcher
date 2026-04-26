-- Migration 0016: user_profiles + L1~L5 tier(NEXT_TASK_009 階段 4)
--
-- 用途:多使用者系統的「人」表 — 1 對 1 對應 auth.users
-- 套用方式:Supabase Studio SQL Editor 直接貼上執行。
--
-- 前置:Vincent 必須先在 Supabase Dashboard → Authentication → Providers
-- 啟用 Email provider,設好 Site URL(https://tw-stock-watcher.zeabur.app)。
--
-- 套線上後:
--   1. Vincent 用自己的 email 註冊一次(Supabase Auth)
--   2. 找到 auth.users.id(在 Supabase Dashboard)
--   3. UPDATE user_profiles SET tier='L1' WHERE id='<uuid>'

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    tier VARCHAR(10) DEFAULT 'L5'
        CHECK (tier IN ('L1', 'L2', 'L3', 'L4', 'L5')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);

-- 自動觸發:auth.users 新註冊時自動建一份 user_profiles(L5 預設)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name, tier)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'L5'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 若已存在則先 drop 再 create(冪等)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS:使用者只能讀寫自己的 profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own profile" ON user_profiles;
CREATE POLICY "users can read own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "users can update own profile" ON user_profiles;
CREATE POLICY "users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);
