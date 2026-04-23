# 🎖️ C/N/R/SR/SSR 評級系統

## 🎯 核心概念

VSIS 用**動漫/手遊抽卡系統**熟悉的 5 階評級，代替傳統「買進/持有/賣出」。

原因：
- ✅ 直覺（看到 SSR 就知道稀有）
- ✅ 有趣（有遊戲感）
- ✅ 客觀（對應分數區間）
- ✅ 無爭議（不像「強推」「推薦」有誤導嫌疑）

---

## 📊 分數對應表

| 評級 | 分數範圍 | 顏色 | 意義 | 中文稱呼 |
|---|---|---|---|---|
| **C** | 0-20 | ⬛ 深灰 `#4A4A4A` | 避開 | 普卡 Common |
| **N** | 21-40 | ⬜ 中灰 `#8A8170` | 中性觀望 | 一般 Normal |
| **R** | 41-60 | ⬜ 淺灰 `#B8B0A0` | 值得關注 | 稀有 Rare |
| **SR** | 61-80 | 🟥 朱紅 `#B85450` | 推薦布局 | 特稀有 Super Rare |
| **SSR** | 81-100 | 🟨 金茶 `#B8893D` | 頂級機會 | 最稀有 SSR |

---

## 🧮 分數計算邏輯

### 四象限加總（總分 95）

```
基本面（20）:
  EPS 為正        +4
  EPS 近 2 季成長  +4
  營收 3 個月 YoY  +4
  毛利率 > 30%    +4
  自由現金流為正   +4

籌碼面（20）:
  外資 5 日淨買超  +4
  投信 5 日淨買超  +4
  籌碼集中度       +4
  融資餘額變化     +4
  隔日沖客不明顯   +4

技術面（20）:
  均線多頭排列     +4
  量價配合         +4
  相對強度         +4
  型態辨識         +4
  支撐壓力位       +4

題材面（20）:
  熱度 > 70        +4
  在主升段         +4
  供應鏈關鍵位置   +4
  法人買盤進駐     +4
  社群熱度上升     +4

市場調整（±15）:
  大盤強勢 +15
  大盤弱勢 -15
```

### 轉換公式

```javascript
function calculateTier(score) {
  // score 0-95 轉 0-100 百分比
  const percentage = (score / 95) * 100;

  if (percentage <= 20) return 'C';
  if (percentage <= 40) return 'N';
  if (percentage <= 60) return 'R';
  if (percentage <= 80) return 'SR';
  return 'SSR';
}
```

---

## 🎨 視覺呈現規範

### 評級標籤 CSS

```css
/* C - 普卡 */
.tier-c {
  background: #4A4A4A;
  color: #F5EFE0;
  border: 1px solid #4A4A4A;
}

/* N - 一般 */
.tier-n {
  background: #8A8170;
  color: #F5EFE0;
  border: 1px solid #8A8170;
}

/* R - 稀有 */
.tier-r {
  background: #B8B0A0;
  color: #2C2416;
  border: 1px solid #B8B0A0;
}

/* SR - 特稀有（紅色） */
.tier-sr {
  background: #B85450;
  color: #F5EFE0;
  border: 1px solid #B85450;
  box-shadow: 0 2px 8px rgba(184, 84, 80, 0.3);
}

/* SSR - 最稀有（金色，會發光） */
.tier-ssr {
  background: linear-gradient(135deg, #D4A05C, #B8893D);
  color: #F5EFE0;
  border: 1px solid #B8893D;
  box-shadow: 0 4px 16px rgba(184, 137, 61, 0.5);
  position: relative;
  overflow: hidden;
}

.tier-ssr::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(245, 239, 224, 0.4), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}
```

### 評級圖示

```
C   ▪ 簡單圓點
N   ● 實心圓
R   ◆ 菱形
SR  ★ 單星
SSR ✦ 雙星（閃光）
```

---

## 🦆 呱呱的延伸判斷（重要！）

### 原則：「不跳出去找新話題，只在這檔股票上深挖」

當使用者看某檔股票時，呱呱的 AI 分析**必須**：

### ✅ 會做的
1. **基於該股票的資料延伸**
   - 看它的四象限分數
   - 看它的新聞
   - 看它的題材
   - 看它的供應鏈位置
   - 看它的法人動向

2. **深度延伸**
   - 「你看基本面 8/20，是因為 EPS 成長斷層，這個要注意 Q2 財報...」
   - 「這檔在 CCL 題材的上游位置，主升段可能還沒到...」

3. **對比類似標的**
   - 「相似條件的還有 XXX，但那檔 SR 級，這檔 R 級，差在...」

### ❌ 不能做的
- ❌ 突然扯到別的題材（除非直接相關）
- ❌ 重新講一遍市場大盤
- ❌ 給無關的操作建議
- ❌ 脫離這檔股票本身

### 範例：看 2330 台積電時

**❌ 壞的延伸**：
> 「今天大盤跌了 266 點，你要注意 AI 泡沫疑慮，建議看 CCL 漲價的富喬 1815...」
> （跑題了，在講大盤跟 CCL）

**✅ 好的延伸**：
> 「台積電四象限 24/95，N 級。基本面只有 8/20 是因為月營收資料還沒更新，籌碼面 8/20 是因為外資 5 日連賣 800 億（這個比較嚴重）。
>
> 如果你在意的是：
> - 短線：等外資轉買 + 突破月線再進
> - 中線：CoWoS 產能到 2027 還是滿的，基本面支撐強
> - 長線：2 奈米良率、Intel 合作、美國廠獲利稀釋，三個變數要追蹤
>
> 反方觀點：如果 Intel 真的把先進製程做起來，台積電估值會被重估，這是最大風險。」

---

## 📋 評級 UI 使用場景

### 場景 1：個股頁頂部

```
┌─────────────────────────────┐
│  2330 台積電      [ N 級 ]   │  ← 灰色標籤
│  24 / 95 分                  │
│  基 8 籌 8 技 8 題 0         │
└─────────────────────────────┘
```

### 場景 2：首頁「呱呱推薦三碗茶」

```
┌─────────────────────────────┐
│  🥇 富喬 1815   [ SR ]  積極 │  ← 紅色 SR
│     玻纖布龍頭                │
│  ───────────────            │
│                              │
│  🥈 旺宏 2337   [ R ]   觀察 │  ← 灰色 R
│     NOR Flash                │
│  ───────────────            │
│                              │
│  🥉 國精化 4722 [ SSR ] 佳   │  ← 金色 SSR（發光）
│     CCL 樹脂                 │
└─────────────────────────────┘
```

### 場景 3：自選股列表

```
代號      名稱     評級    信心    加入時間
2330     台積電   [N]    24/95   4/15
1815     富喬     [SR]   68/95   4/20
4722     國精化   [SSR]  85/95   4/22
```

### 場景 4：Line 通知

```
🦆 新推薦
股票：智原 3035
評級：[ SR ]  ← 這個標籤在 Flex Message 用紅色
分數：72 / 95
```

---

## 🔄 評級更新頻率

- **即時股價相關分數**：每 30 秒更新（技術面、籌碼面部分）
- **題材熱度**：每 5 分鐘更新
- **基本面**：財報公布時更新
- **最終評級**：每 15 分鐘重算

---

## 📊 資料庫欄位

```sql
ALTER TABLE stocks ADD COLUMN current_score INT;
ALTER TABLE stocks ADD COLUMN current_tier VARCHAR(5);  -- 'C' / 'N' / 'R' / 'SR' / 'SSR'
ALTER TABLE stocks ADD COLUMN score_breakdown JSONB;
ALTER TABLE stocks ADD COLUMN tier_updated_at TIMESTAMP;

CREATE TABLE stock_tier_history (
  id SERIAL PRIMARY KEY,
  stock_code VARCHAR(10),
  score INT,
  tier VARCHAR(5),
  breakdown JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tier_history_stock_time
  ON stock_tier_history(stock_code, recorded_at DESC);
```

---

## 🎯 給 Claude Code 的實作重點

### 1. 首頁呱呱推薦優先挑 SR/SSR
```javascript
const picks = await db.query(`
  SELECT * FROM stocks
  WHERE current_tier IN ('SR', 'SSR')
  ORDER BY current_score DESC
  LIMIT 3
`);
```

### 2. 三碗茶的邏輯
- 🥇 第一碗（補漲）：SR 或 SSR + 剛起漲
- 🥈 第二碗（抗跌）：SR + 已漲一段但相對強
- 🥉 第三碗（等回檔）：SSR + 乖離大需等回檔

### 3. 低於 R 級不推
- 不會出現在首頁推薦
- 但會在自選股顯示（使用者主動加的）
- 個股頁會直接顯示「C 級建議避開」

---

**版本**：v1.0
**最後更新**：2026-04-23
