# NEXT_TASK: STAGE1-T2.6-LLM-WRITE-PATH-COMPLETE-MAP

LLM 寫入路徑完整地圖 + 風險分級

**授權等級**：🔒 READ-ONLY（不修任何 code、不呼叫 Claude API）
**建立時間**：2026-04-26 ~21:50 TPE
**接手者**：Claude Code

## 重要原則
CTO（第三任）跟 Vincent 對焦：「Vincent 只是訊息傳遞者，技術討論該在 CTO 跟 Claude Code 之間直接進行」。

Claude Code 被授權：
1. ✅ 質疑 CTO 的方向
2. ✅ 提出 CTO 沒想到的盤查項
3. ✅ 在執行過程中發現新方向就追下去
4. ✅ 對 STAGE1-T2 / T2.5 的結論也可以質疑

不該做：
1. ❌ 默默照做
2. ❌ 美化結論
3. ❌ 省略卡點
4. ❌ 跑到一半發現方向錯了還硬跑完

## 背景
- STAGE1-T2 方向 5：「15 個 LLM call sites、至少 4 個破口」
- STAGE1-T2.5：HOLDINGS 跟 BACKFILL 用不同 snapshot 函數、不是共用 base
- 推論：N 條獨立鏈、各自有破口、各自要修
- 不知道 N 是多少、不知道每條鏈的破口在哪、不知道優先順序

## 任務目標
做出「所有 LLM 寫入路徑的完整地圖」，每條鏈都標清楚：
1. 從哪觸發（cron / API / script / event）
2. 經過哪些函數
3. prompt 怎麼構造（有沒有注入真實價）
4. 寫到哪個 DB 表 / 哪些欄位
5. 哪些前台位置會讀到
6. 是否有 sanity check
7. 風險分級（紅 / 黃 / 綠）

## 6 項盤查
1. 列出所有 LLM call sites（重新掃 backend 全域）
2. 每條鏈的 prompt 構造方式（是否注入真實價）
3. 每條鏈寫入哪些 DB 表
4. 每條鏈影響哪些前台位置
5. 風險分級（紅黃綠）
6. CTO 規劃的漏洞 + Claude Code 的補充（重試、fallback、cache、批次寫入）

## 禁止事項
- ❌ 不准默默照做
- ❌ 不准美化結論
- ❌ 不准跳過盤查項
- ❌ 不准修任何東西
- ❌ 不准呼叫 Claude API
- ❌ 不准 archive / 刪除 / 隱藏過去預測
- ❌ 不准沿用 STAGE1-T2 / T2.5 結論當前提

## 完成條件
1. ✅ 6 項盤查每項都有結果 + 證據
2. ✅ 完整 LLM 寫入路徑表填滿
3. ✅ 「對 CTO 的反饋」section 有實質內容
4. ✅ outbox 寫進 ceo-desk/outbox/LATEST_REPORT.md
5. ✅ outbox 第一行有系統時間
6. ✅ 工具紀錄完整
7. ✅ 範圍宣告完整

## 完成後
1. outbox 寫好
2. git add ceo-desk/ && git commit + push
3. 告訴 Vincent commit hash
