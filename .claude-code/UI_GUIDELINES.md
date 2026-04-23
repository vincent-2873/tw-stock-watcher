# 🎨 UI 設計規範 · Wabi-Sabi 禪風

## 🌸 設計哲學

**日式禪風 · 和紙質感 · 侘寂美學**

靈感來源：
- 京都精品旅館（虎屋、俵屋）
- 無印良品的留白
- 茶道的「一期一會」
- 寂靜中的細微

---

## 🎨 顏色系統（必須用 CSS 變數）

### 完整變數清單

```css
:root {
  /* ==== 和紙色系（淺、柔、禪）==== */
  --washi: #F5EFE0;              /* 主背景 · 和紙米 */
  --washi-warm: #FAF5E8;         /* 暖紙 */
  --washi-cool: #EDE6D3;         /* 涼紙 */
  --washi-deep: #E4DBC5;         /* 深紙 */

  /* ==== 墨色（文字）==== */
  --sumi: #2C2416;               /* 墨（主文字）*/
  --sumi-soft: #4A3F28;          /* 淡墨 */
  --sumi-mist: #7A6E53;          /* 霧墨 */
  --sumi-whisper: #A89878;       /* 囈墨 */

  /* ==== 朱印色（重點）==== */
  --shu: #B85450;                /* 朱紅 · SR 級 / 重點強調 */
  --shu-light: #D67670;          /* 淡朱 */
  --kin: #B8893D;                /* 金茶 · SSR 級 / 次要重點 */
  --kin-light: #D4A05C;          /* 淡金 */
  --matcha: #7A8B5C;             /* 抹茶（沉靜）*/
  --ao: #4A6B7C;                 /* 藍灰（冷靜）*/

  /* ==== 股市漲跌（低飽和度）==== */
  --rise: #C95B4C;               /* 漲 · 沉紅銅 */
  --rise-light: #F0D4CE;         /* 漲 · 淡底 */
  --fall: #6B8B5A;               /* 跌 · 竹青 */
  --fall-light: #D5DFCA;         /* 跌 · 淡底 */

  /* ==== 題材熱度 ==== */
  --heat-extreme: #A84836;       /* 90+ 極熱 */
  --heat-high: #C9754D;          /* 70-89 熱 */
  --heat-medium: #D4A05C;        /* 50-69 中 */
  --heat-low: #A89878;           /* 30-49 低 */

  /* ==== 評級（C/N/R/SR/SSR）==== */
  --tier-c: #4A4A4A;
  --tier-n: #8A8170;
  --tier-r: #B8B0A0;
  --tier-sr: #B85450;
  --tier-ssr: #B8893D;

  /* ==== 陰影 ==== */
  --shadow-sm: 0 1px 3px rgba(44, 36, 22, 0.06);
  --shadow-md: 0 4px 20px rgba(44, 36, 22, 0.08);
  --shadow-lg: 0 12px 40px rgba(44, 36, 22, 0.12);
  --shadow-gold: 0 8px 32px rgba(184, 137, 61, 0.15);
}
```

### ❌ 絕對禁止

```css
/* 不可以這樣 */
.wrong {
  background: #F5EFE0;           /* ❌ 寫死色碼 */
  color: #2C2416;                /* ❌ */
}

/* 要這樣 */
.right {
  background: var(--washi);       /* ✅ 用變數 */
  color: var(--sumi);             /* ✅ */
}
```

---

## 🔤 字體系統

### 引入

```html
<link href="https://fonts.googleapis.com/css2?
  family=Shippori+Mincho:wght@400;500;600;700
  &family=Zen+Maru+Gothic:wght@300;400;500;700
  &family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400
  &family=JetBrains+Mono:wght@400;500
  &display=swap" rel="stylesheet">
```

### 使用規則

| 用途 | 字體 | 範例 |
|---|---|---|
| 中文標題 | `Shippori Mincho` | 呱呱投資招待所、今日市場脈動 |
| 中文內文 | `Zen Maru Gothic` | 一般說明文字 |
| 英文副標 | `Cormorant Garamond` (italic) | Quack House、Today's Pulse |
| 日文副標 | `Shippori Mincho` | クワック・ハウス |
| 數字 | `JetBrains Mono` | 37,614.15、+2.45% |
| 股票代號 | `JetBrains Mono` | 2330、1815 |

### ❌ 禁用字體

- ❌ `Inter`（太通用）
- ❌ `Arial`（沒質感）
- ❌ `Roboto`（太現代）
- ❌ 系統預設字體

---

## 📐 間距系統

遵守 **8px Grid**：

```
4px   細節間距
8px   元素間距
12px  小卡片內
16px  卡片內（預設）
20px  區塊內小標題
24px  卡片外距
32px  區塊標題
48px  大區塊分隔
80px  段落分隔
```

### 絕對禁止
- ❌ `padding: 7px`（不在 8 的倍數）
- ❌ `margin: 15px`（不在 8 的倍數）

---

## 🔲 圓角規範

**侘寂風用小圓角，不要大圓角**

```css
--radius-xs: 2px;   /* 標籤、chip */
--radius-sm: 4px;   /* 卡片、按鈕 */
--radius-md: 8px;   /* 大卡片 */
--radius-lg: 16px;  /* 特殊情況（如 Hero 區）*/
--radius-full: 50%; /* 圓形（呱呱、頭像）*/
```

### ❌ 禁止
- ❌ `border-radius: 20px`（太圓，不禪）
- ❌ `border-radius: 50px`（太誇張）

**例外**：浮動呱呱按鈕、頭像、呼吸圈才用 `50%`

---

## ✨ 動畫規範

### 緩動函數（Easing）

```css
/* 標準 */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

/* 彈性（呱呱相關）*/
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* 進場 */
--ease-enter: cubic-bezier(0, 0, 0.2, 1);

/* 出場 */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

### 常用動畫

```css
/* 進場淡入 */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 呱呱呼吸 */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* 漣漪 */
@keyframes ripple {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(1.05); }
}

/* SSR 閃光 */
@keyframes shine {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

/* 花瓣飄落 */
@keyframes floatPetal {
  0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
  10%, 90% { opacity: 0.2; }
  100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
}
```

### 時間

- 微互動（hover）：200ms
- 卡片變化：400ms
- 進場動畫：600-800ms
- 背景動畫：3-6s（呼吸、漣漪）
- 裝飾（花瓣）：20-30s

---

## 📱 RWD 斷點

```css
/* Mobile First */
/* 預設：手機 */

@media (min-width: 640px)  { /* 平板直 */ }
@media (min-width: 1024px) { /* 平板橫 / 小筆電 */ }
@media (min-width: 1280px) { /* 桌面 */ }
```

### 手機版特殊處理
- 導航隱藏進漢堡選單
- Hero 區變單欄
- 市場脈動變 2x2 或單欄
- 題材卡全寬
- 浮動呱呱移到更顯眼位置

---

## 🧩 元件規範

### 卡片（Card）

```css
.card {
  background: var(--washi-warm);
  border: 1px solid rgba(168, 152, 120, 0.15);
  border-radius: var(--radius-sm);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: all 0.4s var(--ease-standard);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(184, 137, 61, 0.3);
}
```

### 按鈕（Button）

```css
/* 主要按鈕 */
.btn-primary {
  background: var(--sumi);
  color: var(--washi);
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-family: 'Shippori Mincho', serif;
  letter-spacing: 0.1em;
}

/* 次要按鈕 */
.btn-secondary {
  background: transparent;
  color: var(--sumi);
  border: 1px solid var(--sumi-whisper);
}

/* 禁用 Bootstrap 預設按鈕樣式 */
```

### 標籤（Chip）

```css
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: var(--washi-cool);
  border: 1px solid rgba(168, 152, 120, 0.2);
  border-radius: var(--radius-xs);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
```

---

## 🦆 呱呱元素規範

### 呱呱 emoji
- 統一用 🦆（不要混用其他鴨子）
- 主要位置：Hero 圓圈、右下角浮動
- 尺寸：Hero 160px、浮動 36px、小型 16px

### 呱呱圓圈（Hero）

```css
.quack-circle {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--washi-warm), var(--washi-cool) 70%);
  box-shadow: inset 0 0 60px rgba(184, 137, 61, 0.1), var(--shadow-lg);
  animation: breathe 6s ease-in-out infinite;
}
```

### 浮動呱呱

```css
.floating-quack {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--kin), var(--shu));
  box-shadow: 0 8px 32px rgba(184, 137, 61, 0.4);
}
```

---

## 🎭 裝飾元素

### 花瓣（可選）

```html
<div class="petal"></div>
<!-- 最多 4 片同時飄 -->
```

### 區塊分隔線

```css
.divider {
  background: linear-gradient(to right,
    rgba(184, 137, 61, 0.3),
    transparent
  );
  height: 1px;
}
```

### 虛線

```css
.dashed {
  border-bottom: 1px dashed rgba(168, 152, 120, 0.2);
}
```

---

## ❌ 設計禁忌

### 顏色
- ❌ 純黑 `#000000`（太硬，用 `--sumi`）
- ❌ 純白 `#FFFFFF`（太亮，用 `--washi`）
- ❌ 鮮紅 `#FF0000`（俗豔，用 `--rise` 或 `--shu`）
- ❌ 螢光綠（太刺眼）
- ❌ 紫色漸變（太 AI 味）

### 字體
- ❌ 混用超過 4 種字體
- ❌ 用系統預設字體
- ❌ 字重低於 300 或高於 700

### 動畫
- ❌ 超過 1 秒的 hover 動畫
- ❌ 搖晃、震動（干擾閱讀）
- ❌ 自動播放有聲音

### 互動
- ❌ 未授權的彈窗
- ❌ 強制全螢幕
- ❌ 阻擋右鍵

---

**版本**：v1.0
**最後更新**：2026-04-23
