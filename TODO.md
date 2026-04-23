# 🦆 VSIS · 待處理事項

## 🟡 lockfile 重複警告(2026-04-24)
- **症狀**:`pnpm build` 警告 "Detected additional lockfiles"
- **原因**:根目錄 + `frontend/` 各有一份 `pnpm-lock.yaml`
- **影響**:目前不影響 build / deploy,但未來可能有奇怪的依賴問題
- **優先級**:低
- **建議**:確認專案是否有用 workspace 功能,決定保留哪一份
- **開 task 時機**:遇到依賴相關 bug 時優先處理
