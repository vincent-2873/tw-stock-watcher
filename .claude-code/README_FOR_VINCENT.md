# 🦆 VSIS 最終交付包 · 使用說明

> **Vincent 專用導讀**
> **交付日期**：2026-04-23
> **版本**：v3.0 最終版

---

## 📦 檔案清單

### 🎯 核心 2 份（Claude Code 會讀的）

```
21_FINAL_MASTER_PLAN.md     ← 總指令書（Claude Code 執行依據）
22_ZEN_HOMEPAGE_v4.html     ← 視覺原型（Claude Code 參考 UI）
```

### 🔧 要放進專案的 7 份規則文件

```
claude-code-install/
├── CLAUDE.md               ← 放專案根目錄
└── .claude-code/
    ├── CORE_PRINCIPLES.md  ← 呱呱哲學
    ├── UI_GUIDELINES.md    ← 禪風 UI 規範
    ├── DATA_RULES.md       ← 時間/FinMind 規則
    ├── SCORING_SYSTEM.md   ← C/N/R/SR/SSR 邏輯
    ├── LINE_NOTIFY_RULES.md ← 5 種 Flex Message
    └── ALERT_TRIGGERS.md    ← 警示觸發清單
```

---

## 🎬 接下來要做的 3 步驟

### Step 1：下載整包檔案

從 `/mnt/user-data/outputs/vsis_docs/` 下載全部。

### Step 2：放進 VSIS 專案

```bash
# 到你的 VSIS 專案目錄
cd ~/path/to/vsis

# 複製 Claude Code 規則文件
cp ~/Downloads/vsis_docs/claude-code-install/CLAUDE.md .
cp -r ~/Downloads/vsis_docs/claude-code-install/.claude-code .

# 提交到 git
git add CLAUDE.md .claude-code/
git commit -m "加入 Claude Code 規範文件（禪風 + 評級系統 + Line 通知 + 警示）"
git push
```

### Step 3：給 Claude Code 這段指令

```
請嚴格按照以下順序執行：

1. 先讀專案根目錄的 CLAUDE.md
2. 再讀 .claude-code/ 下所有文件
3. 再讀我給你的 21_FINAL_MASTER_PLAN.md
4. 視覺參考 22_ZEN_HOMEPAGE_v4.html

現在開始執行「階段 0：緊急修復」：

🔴 必須修的 7 個 bug：
1. Hero 日期寫死（應該用 JS 動態生成）
2. FinMind API 我已付費 Sponsor 但沒抓到資料
3. 費半指數顯示「—」（FMP 沒接上）
4. 題材熱度是假資料（要接社群/新聞分析）
5. 「今日關鍵發言」空殼（要接 X/人物發言）
6. 信心度首頁 95% vs 個股頁 27% 矛盾
7. 個股頁進入會自動捲到底（應停頂部）

完成 1 個 bug 就部署 + 截圖給我看，不要等全部修完才給我。
不要跳階段，不要自己發揮。

💡 遇到不確定時，查 .claude-code/ 對應文件。
```

---

## 📋 最關鍵的 5 件事（Claude Code 會記住）

1. **時間必須動態**（不能寫死「April 24 · 00:15」）
2. **評級只能用 C/N/R/SR/SSR**（不能創自己的級別）
3. **資料空就隱藏**（不能顯示「——」）
4. **CSS 用變數**（不能寫死色碼）
5. **個股頁停頂部**（不能捲到底）

---

## 🎯 階段進度追蹤表

Claude Code 每做完一階段，請他更新這個表：

```
階段 0：緊急修復
  [ ] 時間動態化
  [ ] FinMind 驗證
  [ ] 費半 API
  [ ] 個股頁停頂
  [ ] 信心度一致
  [ ] 空狀態改寫
  [ ] 社群題材熱度接真資料

階段 1：UI 對齊
  [ ] 導航改直觀名稱
  [ ] 刪 /backtest /paper /alerts
  [ ] 評級徽章全站套用
  [ ] SSR 發光效果

階段 2：情報中樞
  [ ] 建 4 個資料表
  [ ] 填 13 個 RSS 源
  [ ] 填 23 位重點人物
  [ ] 爬蟲實作
  [ ] AI 分析排程

階段 3：Line + 警示
  [ ] Line Webhook
  [ ] 5 種 Flex Message
  [ ] 警示監測迴圈
  [ ] 呱呱命中率
```

---

## 🦆 Vincent 的權利

你隨時可以跟 Claude Code 說：

- **「重讀 .claude-code/ 文件再做」** — 如果他做歪
- **「現在階段 X 的 Y 項做完了嗎？」** — 追進度
- **「這違反 CLAUDE.md 第 X 條」** — 糾正
- **「先不管新功能，修 bug」** — 改優先級

---

## 💬 如果未來要新增規則

直接修改 `.claude-code/` 相應文件，commit 推上去。
Claude Code 下次讀會看到新規則。

例如新增一個評級（假設你想加 UR — Ultra Rare）：

1. 改 `.claude-code/SCORING_SYSTEM.md` 加 UR 定義
2. 改 `CLAUDE.md` 的「7 條鐵則」提到 UR
3. git commit + push

Claude Code 下次就會遵守。

---

**這個檔案**建議你存在桌面或 Notion，未來隨時翻閱。

祝呱呱招待所順利 🦆
