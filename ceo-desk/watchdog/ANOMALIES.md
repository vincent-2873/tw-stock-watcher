# 🐺 Watchdog ANOMALIES Log

> 自動累積異常紀錄。**Claude Code 每次 session 開始應讀本檔**。
> 來源：`.github/workflows/watchdog.yml` 每 15 分鐘跑一次。
> 規則：watchdog 只記錄、不自動修，所有真正的修復要人類（Vincent / CTO / Claude Code）介入。

## 開檔狀態

2026-04-25 00:08 TPE 首次啟用，watchdog dry-run 全 7 項健康。
本檔在偵測到第一個異常時開始累積紀錄。

---

## 2026-04-24T16:10:24.597748+00:00 (TPE fallback) — 6 個異常


- **time** (`/api/time/now`) status=0 latency=15419ms
  - ❌ /api/time/now returned 0: 'Exception: TimeoutError: The read operation timed out'
  - sample: `"Exception: TimeoutError: The read operation timed out"`

- **finmind** (`/api/diag/finmind`) status=0 latency=15411ms
  - ❌ status 0
  - sample: `"Exception: TimeoutError: The read operation timed out"`

- **market_overview** (`/api/market/overview`) status=0 latency=15327ms
  - ❌ status 0
  - sample: `{}`

- **topics** (`/api/topics`) status=0 latency=15435ms
  - ❌ status 0
  - sample: `{"count": null}`

- **chat_health** (`/api/chat/health`) status=0 latency=15408ms
  - ❌ status 0
  - sample: `"Exception: TimeoutError: The read operation timed out"`

- **resolver** (`/api/diag/resolver`) status=0 latency=15350ms
  - ❌ status 0
  - sample: `"Exception: TimeoutError: The read operation timed out"`

---

## 2026-04-25T00:59:20.693612+08:00 — Self Audit 發現新問題

- **agents_endpoint**: ❌ /api/agents status=502
- **visual_assets**: ❌ 11/11 位 agent 視覺還缺(用 emoji 占位中)

---

## 2026-04-25T02:03:58.965396+08:00 (py-zoneinfo fallback) — 6 個異常


- **time** (`/api/time/now`) status=502 latency=5864ms
  - ❌ /api/time/now returned 502: 'HTTPError: Bad Gateway'
  - sample: `"HTTPError: Bad Gateway"`

- **finmind** (`/api/diag/finmind`) status=502 latency=7581ms
  - ❌ status 502
  - sample: `"HTTPError: Bad Gateway"`

- **market_overview** (`/api/market/overview`) status=502 latency=10476ms
  - ❌ status 502
  - sample: `{}`

- **topics** (`/api/topics`) status=502 latency=6687ms
  - ❌ status 502
  - sample: `{"count": null}`

- **chat_health** (`/api/chat/health`) status=502 latency=6237ms
  - ❌ status 502
  - sample: `"HTTPError: Bad Gateway"`

- **resolver** (`/api/diag/resolver`) status=502 latency=7909ms
  - ❌ status 502
  - sample: `"HTTPError: Bad Gateway"`

---

## 2026-04-25T03:25:45.966960+08:00 — Self Audit 發現新問題

- **watchdog_freshness**: ❌ watchdog 已 82 分鐘沒跑(>45 分,可能 GHA 壞了)

---

## 2026-04-25T04:05:01.596494+08:00 — Self Audit 發現新問題

- **agents_endpoint**: ❌ /api/agents status=0
- **watchdog_freshness**: ❌ watchdog 已 122 分鐘沒跑(>45 分,可能 GHA 壞了)

---

## 2026-04-25T05:10:00.911822+08:00 — Self Audit 發現新問題

- **watchdog_freshness**: ❌ watchdog 已 187 分鐘沒跑(>45 分,可能 GHA 壞了)

---

## 2026-04-25T06:06:07.972763+08:00 — Self Audit 發現新問題

- **watchdog_freshness**: ❌ watchdog 已 243 分鐘沒跑(>45 分,可能 GHA 壞了)

---

## 2026-04-25T07:03:35.960274+08:00 — Self Audit 發現新問題

- **watchdog_freshness**: ❌ watchdog 已 300 分鐘沒跑(>45 分,可能 GHA 壞了)

---
