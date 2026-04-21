// 臨時類型（待 supabase gen types 覆蓋）
export type Database = {
  public: {
    Tables: {
      watchlists: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { user_id: string; name?: string };
        Update: { name?: string };
      };
      watchlist_items: {
        Row: { id: string; watchlist_id: string; symbol: string; market: string; sort_order: number; created_at: string };
        Insert: { watchlist_id: string; symbol: string; market?: string; sort_order?: number };
        Update: { sort_order?: number };
      };
      alerts: {
        Row: { id: string; user_id: string; symbol: string; condition: Record<string, unknown>; channel: string; enabled: boolean; triggered_at: string | null; created_at: string };
        Insert: { user_id: string; symbol: string; condition: Record<string, unknown>; channel: string; enabled?: boolean };
        Update: { enabled?: boolean; triggered_at?: string };
      };
      news_sentiment: {
        Row: { id: string; url: string; title: string | null; source: string | null; published_at: string | null; score: number | null; label: string | null; summary: string | null; stocks: string[] | null; fetched_at: string };
        Insert: { url: string; title?: string; source?: string; published_at?: string; score?: number; label?: string; summary?: string; stocks?: string[] };
        Update: Record<string, unknown>;
      };
      health_snapshots: {
        Row: { id: string; symbol: string; date: string; overall: number | null; tech: number | null; chip: number | null; sentiment: number | null; grade: string | null; signals: unknown; created_at: string };
        Insert: { symbol: string; date: string; overall?: number; tech?: number; chip?: number; sentiment?: number; grade?: string; signals?: unknown };
        Update: Record<string, unknown>;
      };
      user_prefs: {
        Row: { user_id: string; theme: string; default_market: string; push_line: string | null; push_discord: string | null; updated_at: string };
        Insert: { user_id: string; theme?: string; default_market?: string; push_line?: string; push_discord?: string };
        Update: { theme?: string; default_market?: string; push_line?: string; push_discord?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
