# TW Stock Watcher — Claude 專案指引

## 大目標
打造**賺錢的台股分析看盤 Web App**，持續迭代直到使用者成功獲利。

## 鐵律
1. **新增 > 覆蓋**：加新檔加新功能，不動其他專案
2. **每輪帶一個新功能或提升準確度**，不重複做過的事
3. **自動部署**：Supabase + GitHub + Zeabur 三位一體
4. **手機優先**：所有 UI 先設計手機，後響應桌面
5. **免費為主**：API 超過免費額度才考慮付費

## 程式碼規範
- TypeScript strict + zod 驗證所有外部資料
- 錯誤用 `Result<T, E>` pattern，不噴例外
- Server Components 為主，Client Components 只在需要互動處
- Supabase query 一律走 `lib/supabase/server.ts` 或 `client.ts`

## 資料夾
```
app/           # Next.js App Router 頁面
components/    # 共用 UI
lib/
  supabase/    # DB client
  data-sources/# TWSE / FinMind / Fugle / yfinance 封裝
  analysis/    # RSI / MACD / 籌碼 / 情緒
  utils/       # 格式化、日期、台股代號
types/         # TS types + supabase 自動產生
supabase/
  migrations/  # SQL
  functions/   # Edge Functions（定時爬新聞等）
scripts/       # 一次性工具
```

## 每輪開發流程
1. 讀 README + CLAUDE.md
2. 看 `docs/ROADMAP.md` 抓下一個功能
3. 建分支 `feat/xxx`
4. 寫程式 + 測試
5. commit + push → Zeabur 自動部署
6. 更新 `docs/CHANGELOG.md`
7. 給 user：新功能、截圖、連結

## 不做的事
- 不用使用者密碼
- 不代註冊帳號
- 不存任何機敏資料到 git
