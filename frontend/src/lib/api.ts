// 後端 API 呼叫封裝
// 開發:NEXT_PUBLIC_API_URL=http://localhost:8000
// 生產:NEXT_PUBLIC_API_URL=https://your-backend.zeabur.app

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Backend ${r.status}: ${await r.text()}`);
  }
  return (await r.json()) as T;
}

// ===== 基本 =====
export interface BackendHealth {
  status: "ok" | "degraded" | string;
  supabase: "ok" | "fail" | string;
  tpe_now: string;
  error?: string;
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  return request<BackendHealth>("/health");
}

export async function fetchTwStock(stockId: string, days = 30) {
  return request<{
    stock_id: string;
    count: number;
    data: Array<{
      date: string;
      stock_id: string;
      open: number;
      close: number;
      high: number;
      low: number;
      Trading_Volume: number;
    }>;
    meta: { source: string; fetched_at: string; dataset: string };
  }>(`/api/stocks/tw/${stockId}?days=${days}`);
}

export async function fetchUsStock(symbol: string) {
  return request<{
    symbol: string;
    data: {
      symbol: string;
      name: string;
      price: number;
      change: number;
      changesPercentage: number;
    };
    meta: { source: string; fetched_at: string };
  }>(`/api/stocks/us/${symbol}`);
}

// ===== VSIS 分析 =====

export type Recommendation =
  | "strong_buy"
  | "buy"
  | "watch"
  | "hold"
  | "avoid";

export interface DimEvidence {
  score: number;
  details: Record<string, unknown>;
  warnings: string[];
}

export interface AnalysisResult {
  stock_id: string;
  stock_name: string;
  market: string;
  timestamp: string;
  recommendation: Recommendation;
  recommendation_emoji: string;
  total_score: number;
  confidence: number;
  base_score: number;
  market_adjustment: number;
  regime: { states: string[]; description: Record<string, string> };
  evidence: {
    fundamental: DimEvidence;
    chip: DimEvidence;
    technical: DimEvidence;
    catalyst: DimEvidence;
  };
  risk: {
    entry_price: number;
    stop_loss_price: number;
    take_profit_price: number;
    take_profit_trail: number;
    atr: number;
    atr_pct: number;
    risk_pct: number;
    reward_risk_ratio: number;
  } | null;
  position: {
    account_size: number;
    risk_pct: number;
    risk_amount: number;
    entry_price: number;
    stop_loss_price: number;
    stop_loss_distance: number;
    shares: number;
    lots: number;
    notional: number;
    notional_pct: number;
    expected_loss: number;
  } | null;
  bull_case: string[];
  bear_case: string[];
  data_snapshot: Record<string, unknown>;
  disclaimer: string;
}

export async function fetchAnalysis(
  stockId: string,
  options: { skipAi?: boolean; newsSummary?: string } = {},
): Promise<AnalysisResult> {
  const skipAi = options.skipAi ?? true;
  const params = new URLSearchParams({ skip_ai: String(skipAi) });
  if (options.newsSummary) params.set("news_summary", options.newsSummary);
  return request<AnalysisResult>(`/api/analyze/${stockId}?${params}`);
}

export interface ReportRow {
  id: number;
  report_type: string;
  report_date: string;
  content: Record<string, unknown>;
  summary: string | null;
  generated_at: string;
}

export async function fetchLatestReports(
  report_type: string = "closing",
  limit = 3,
): Promise<{ reports: ReportRow[] }> {
  return request(`/api/reports/latest?report_type=${report_type}&limit=${limit}`);
}

export interface AlertRow {
  id: number;
  stock_id: string;
  alert_type: string;
  severity: "urgent" | "warning" | "info";
  message: string;
  triggered_at: string;
  metadata?: Record<string, unknown>;
}

export async function fetchRecentAlerts(
  days = 3,
  limit = 50,
): Promise<{ alerts: AlertRow[] }> {
  return request(`/api/alerts/recent?days=${days}&limit=${limit}`);
}

export interface WatchlistItem {
  stock_id: string;
  added_at: string;
  notes: string | null;
  analysis?: {
    recommendation: Recommendation;
    recommendation_emoji: string;
    total_score: number;
    confidence: number;
    error?: string;
  };
}

export async function fetchWatchlist(
  includeAnalysis = false,
): Promise<{ items: WatchlistItem[]; count: number; tpe_now: string }> {
  return request(`/api/watchlist?include_analysis=${includeAnalysis}`);
}

export interface RecommendationRow {
  id: number;
  stock_id: string;
  recommendation: Recommendation;
  confidence: number;
  total_score: number;
  report_type: string;
  evidence: unknown;
  data_snapshot: unknown;
  created_at: string;
}

export async function fetchRecentRecommendations(
  limit = 20,
  reportType?: string,
): Promise<{ items: RecommendationRow[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (reportType) params.set("report_type", reportType);
  return request(`/api/recommendations/recent?${params}`);
}

// ===== 大盤 =====
export interface MarketQuote {
  date?: string;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  turnover_twd?: number;
  day_change?: number | null;
  day_change_pct?: number | null;
}

export interface MarketOverview {
  tpe_now: string;
  taiex?: MarketQuote;
  taiex_error?: string;
  futures_tx?: MarketQuote & { contract?: string };
  futures_error?: string;
  us?: Record<string, {
    label?: string;
    price?: number;
    change?: number;
    changes_pct?: number;
  }>;
  us_error?: string;
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
  return request("/api/market/overview");
}

export async function fetchTaiex(days = 60) {
  return request<{
    index: string;
    latest: MarketQuote;
    history: { date: string; close: number; volume: number }[];
    meta: { source: string; fetched_at: string };
  }>(`/api/market/taiex?days=${days}`);
}

export async function fetchFutures(contract = "TX", days = 30) {
  return request<{
    contract: string;
    near_month?: string;
    latest: MarketQuote;
    history: { date: string; close: number; volume: number }[];
    meta: { source: string; fetched_at: string };
  }>(`/api/market/futures?contract=${contract}&days=${days}`);
}

// ===== 新聞 =====
export interface NewsItem {
  date?: string;
  title?: string;
  description?: string;
  link?: string;
  source?: string;
  stock_id?: string;
}

export async function fetchStockNews(stockId: string, days = 7) {
  return request<{
    stock_id: string;
    count: number;
    items: NewsItem[];
    meta: { source: string; fetched_at: string };
  }>(`/api/news/stock/${stockId}?days=${days}`);
}

export async function fetchRecentNews(days = 2, limit = 30) {
  return request<{
    count: number;
    items: NewsItem[];
    meta: { source: string; fetched_at: string };
  }>(`/api/news/recent?days=${days}&limit=${limit}`);
}

// ===== 分點進出 =====
export interface BrokerRow {
  broker: string;
  buy: number;
  sell: number;
  net: number;
  avg_buy_price?: number | null;
  avg_sell_price?: number | null;
  days?: number;
}

export async function fetchBrokerFlow(stockId: string, date?: string, top = 20) {
  const params = new URLSearchParams({ top: String(top) });
  if (date) params.set("date", date);
  return request<{
    stock_id: string;
    date: string;
    total_brokers: number;
    top_buyers: BrokerRow[];
    top_sellers: BrokerRow[];
    meta: { source: string; fetched_at: string };
  }>(`/api/brokers/${stockId}?${params}`);
}

export async function fetchBrokerSummary(stockId: string, days = 5) {
  return request<{
    stock_id: string;
    days: number;
    dates: string[];
    top_buyers: BrokerRow[];
    top_sellers: BrokerRow[];
  }>(`/api/brokers/${stockId}/summary?days=${days}`);
}

// ===== 回測 =====
export interface BacktestTrade {
  action: string;
  date: string;
  price: number;
  shares: number;
  cash_after: number;
}

export interface BacktestResponse {
  stock_id: string;
  strategy: string;
  start_date: string;
  end_date: string;
  initial_cash: number;
  final_value: number;
  total_return_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  trades_count: number;
  sharpe: number;
  trades: BacktestTrade[];
  equity_curve?: { date: string; equity: number; close: number }[];
  equity_curve_sample?: { date: string; equity: number; close: number }[];
}

export async function runBacktest(body: {
  stock_id: string;
  strategy?: string;
  start: string;
  end?: string;
  initial_cash?: number;
}): Promise<BacktestResponse> {
  return request("/api/backtest", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchBacktestStrategies(): Promise<{
  strategies: string[];
  descriptions: Record<string, string>;
}> {
  return request("/api/backtest/strategies");
}

// ===== 模擬交易 =====
export interface PaperPosition {
  stock_id: string;
  shares: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

export interface PaperAccount {
  user_id: string;
  account_id?: string;
  cash: number;
  market_value: number;
  total: number;
  initial_capital: number;
  total_return_pct: number;
  total_pnl: number;
  closed_trades: number;
  winning_trades: number;
  positions: PaperPosition[];
  tpe_now: string;
  error?: string;
}

export async function fetchPaperAccount(user_id = "vincent"): Promise<PaperAccount> {
  return request(`/api/paper/account?user_id=${user_id}`);
}

export async function fetchPaperTrades(user_id = "vincent", limit = 50) {
  return request<{ items: Record<string, unknown>[]; tpe_now: string }>(
    `/api/paper/trades?user_id=${user_id}&limit=${limit}`,
  );
}

export async function placePaperOrder(body: {
  stock_id: string;
  action: "buy" | "sell";
  shares: number;
  price?: number;
  user_id?: string;
  notes?: string;
}) {
  return request<{
    ok: boolean;
    message: string;
    trade: Record<string, unknown>;
    cash_after: number;
  }>("/api/paper/order", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function resetPaperAccount(user_id = "vincent") {
  return request<{ ok: boolean; user_id: string; cash: number }>(
    `/api/paper/reset?user_id=${user_id}`,
    { method: "POST" },
  );
}
