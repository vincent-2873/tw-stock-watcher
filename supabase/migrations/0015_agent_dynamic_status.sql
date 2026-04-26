-- Migration 0015: agent_stats 動態狀態欄位（NEXT_TASK_009 階段 2）
--
-- 目的：辦公室 RPG-化，agent 顯示當前在做什麼（thinking / meeting / writing /
-- predicting / debating / learning / resting）
--
-- 設計：可選 migration — 系統不依賴此欄位，規則引擎依「時間 + agent_id」
-- 即時推算 status；DB 欄位用於「人為覆寫」與「歷史軌跡稽核」。
--
-- 套用方式：在 Supabase Studio SQL Editor 貼上執行即可。
-- 不套也無妨 — `/api/agents/{slug}/status` 一樣回正確結果。

-- agent_stats 加 status 三欄位
ALTER TABLE agent_stats
    ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'resting'
        CHECK (current_status IN (
            'thinking', 'meeting', 'writing', 'predicting',
            'debating', 'learning', 'resting'
        ));

ALTER TABLE agent_stats
    ADD COLUMN IF NOT EXISTS status_detail TEXT;

ALTER TABLE agent_stats
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 註：systems prefer rule-based status（無 DB 寫入）。
-- 此 migration 是預留，未來若加入「人為設定 status」或「歷史 audit」會用到。
