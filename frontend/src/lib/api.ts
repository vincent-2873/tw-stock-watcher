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
