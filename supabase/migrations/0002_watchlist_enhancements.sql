-- 擴充 watchlist_items 支援備註、目標價、停損、分類（依規格書 F2）
alter table public.watchlist_items
  add column if not exists stock_name text,
  add column if not exists category text,           -- 半導體/AI/題材股
  add column if not exists notes text,
  add column if not exists target_buy numeric(10, 2),
  add column if not exists target_sell numeric(10, 2),
  add column if not exists stop_loss numeric(10, 2);

-- 推播排程設定（為後續 LINE/Discord 推播準備）
create table if not exists public.push_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  kind text not null,                 -- 'pre_market' | 'post_market' | 'weekly'
  channel text not null,              -- 'line' | 'discord' | 'email'
  target text not null,               -- webhook / chat id / email
  enabled boolean default true,
  created_at timestamptz default now()
);
alter table public.push_schedules enable row level security;
create policy "own push" on public.push_schedules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 交易紀錄（給週報用）
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  symbol text not null,
  action text not null,               -- 'buy' | 'sell'
  quantity int not null,
  price numeric(10, 2) not null,
  fee numeric(10, 2) default 0,
  tax numeric(10, 2) default 0,
  trade_date date not null,
  notes text,
  created_at timestamptz default now()
);
alter table public.trades enable row level security;
create policy "own trades" on public.trades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_trades_user_date on public.trades (user_id, trade_date desc);
