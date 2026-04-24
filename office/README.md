# 🏛️ 呱呱招待所 · 內部辦公室

> 本 app **獨立於前台** `tw-stock-watcher.zeabur.app`，是分開網域的 Zeabur service。

## 網址

- **辦公室（本 app）**：https://quack-office.zeabur.app/
- **前台**：https://tw-stock-watcher.zeabur.app/
- **後端 API**（兩邊共用）：https://vsis-api.zeabur.app/

## 架構

```
tw-stock-watcher (monorepo)
├── frontend/   → tw-stock-watcher.zeabur.app  (使用者的股票網站)
├── backend/    → vsis-api.zeabur.app          (FastAPI，兩邊共用)
└── office/     → quack-office.zeabur.app      (本 app — CEO 內部辦公室)
```

## 絕對紅線

- ❌ **絕對不要**把 office 的元件、路由、nav 加到 frontend/
- ❌ **絕對不要**把 frontend 的商業導覽加到 office/
- ✅ 兩邊可以呼叫同一個 backend API
- ✅ 可共用 ceo-desk/context/ 底下的設計文件

## 內容

| 頁面 | 路徑 | 用途 |
|---|---|---|
| 首頁 | `/` | 系統健康度 + 快速連結 + 待辦 |
| 分析師名冊 | `/agents` | 12 位 agent persona + 命中率 |
| （未來）會議記錄 | `/meetings` | 每日會議全文公開 |
| （未來）Watchdog | `/monitoring` | 系統自我監控儀表板 |

## 部署

- Zeabur service ID: `69eba85ec5278d4159c21dbf`
- Project: `69e7a7b8d974b2c8b61061d6`（untitled）
- Environment: `69e7a7b828b1ec4f67060830`
- Root Directory: `/office`
- Template: `PREBUILT_V2`（zbpack auto-detect Next.js）
- Branch: `main`
- Trigger: push 到 main 觸發 auto-rebuild

## Env Vars

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | https://vsis-api.zeabur.app |
| `PORT` | ${WEB_PORT}（Zeabur 自動注入） |

## 本機開發

```bash
cd office
pnpm install
pnpm dev
# http://localhost:3000
```

注意：`node_modules/` 在 Windows OneDrive 區會同步很慢，建議本機開發時先把 office/ 的 node_modules 排除 OneDrive 同步。

## 建立歷程

2026-04-25 01:30 TPE — Claude Code 透過 Zeabur CLI + GraphQL API 自動建立：
1. `zeabur service deploy --template GIT` 建 service
2. GraphQL `updateRootDirectory` 設 `/office`
3. `zeabur variable create` 設 env
4. `zeabur domain create --generated` 建 `quack-office.zeabur.app`
5. `zeabur service redeploy` 觸發首次 build

Vincent 沒按任何按鈕，全 CLI + GraphQL 自動化。
