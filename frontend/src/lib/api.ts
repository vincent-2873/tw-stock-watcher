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
  note: string | null;
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
