-- ============================================================
-- TW Stock Watcher Schema — 初始化
-- 在 Supabase SQL Editor 貼上執行
-- ============================================================

-- 使用者自選清單
create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null default '我的自選',
  created_at timestamptz default now()
);
alter table public.watchlists enable row level security;
create policy "own watchlists" on public.watchlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references public.watchlists on delete cascade,
  symbol text not null,         -- 2330 / AAPL
  market text not null default 'TW', -- TW / US / FX
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (watchlist_id, symbol)
);
alter table public.watchlist_items enable row level security;
create policy "own items" on public.watchlist_items for all
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));

-- 警示規則
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  symbol text not null,
  condition jsonb not null,    -- {type: 'price_above', value: 620} etc.
  channel text not null,        -- 'line' | 'discord' | 'email'
  enabled bool default true,
  triggered_at timestamptz,
  created_at timestamptz default now()
);
alter table public.alerts enable row level security;
create policy "own alerts" on public.alerts for all
  using (auth.uid() = user_id);

-- 新聞情緒快取
create table if not exists public.news_sentiment (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  title text,
  source text,
  published_at timestamptz,
  score real,             -- -1 ~ +1
  label text,             -- 利多 / 利空 / 中性
  summary text,
  stocks text[],
  fetched_at timestamptz default now()
);
create index if not exists idx_news_published on public.news_sentiment (published_at desc);
create index if not exists idx_news_stocks on public.news_sentiment using gin (stocks);

-- 個股健檢歷史（快照）
create table if not exists public.health_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  date date not null,
  overall int,
  tech int,
  chip int,
  sentiment int,
  grade text,
  signals jsonb,
  created_at timestamptz default now(),
  unique (symbol, date)
);
create index if not exists idx_health_symbol on public.health_snapshots (symbol, date desc);

-- 使用者偏好
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  theme text default 'dark',
  default_market text default 'TW',
  push_line text,
  push_discord text,
  updated_at timestamptz default now()
);
alter table public.user_prefs enable row level security;
create policy "own prefs" on public.user_prefs for all using (auth.uid() = user_id);

-- 新用戶自動建自選清單
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.watchlists (user_id, name) values (new.id, '我的自選');
  insert into public.user_prefs (user_id) values (new.id);
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
