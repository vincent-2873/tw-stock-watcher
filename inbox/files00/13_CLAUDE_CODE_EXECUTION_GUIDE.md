# 🎯 Claude Code 精確實作指令清單

> **這份文件是給 Claude Code 的「上工清單」**。照著這份做，不要自己發揮創意。設計決策已經都做完了，你的工作是「精確實作」。

---

## ⚠️ 先讀這一節（最重要）

### 你（Claude Code）可能會做的錯事

1. ❌ **擅自改變配色**：不要用鮮豔的紅綠、不要用 Bootstrap 預設色
2. ❌ **加太多動畫**：侘寂風是「少即是多」，不是「炫技」
3. ❌ **擅自加功能**：只做規劃內的，有任何新想法**先問 Vincent**
4. ❌ **改動後端 API**：API 端點、資料格式**完全保留**
5. ❌ **重寫現有邏輯**：VSIS 四象限評分保留、大盤監測保留、對話 API 保留
6. ❌ **忘記手機版**：每個頁面都要 RWD

### 你的工作範圍

✅ **只改前端 UI 層**
✅ **新增新頁面（按規劃）**
✅ **新增新資料表（按 schema）**
✅ **新增 Cron Job（按排程）**
✅ **整合新 API 資料源（按清單）**

---

## 📋 實作順序（嚴格按照這個順序做）

### 🎯 Week 1：視覺基礎

#### Day 1：環境與配色

```bash
# 1. 安裝新依賴
npm install framer-motion
npm install @tanstack/react-query
npm install zustand
npm install recharts
npm install d3

# 2. 建立色彩系統
# 檔案：app/globals.css
# 複製 11_QUACK_HOUSE_UX_DESIGN.md 的 CSS 變數
```

#### Day 2：字體與基礎元件

```bash
# 1. Google Fonts 引入
# app/layout.tsx 加入：
#   Noto Serif TC
#   Cormorant Garamond
#   JetBrains Mono

# 2. 建立基礎元件
# components/ui/
#   - Card.tsx
#   - Button.tsx
#   - HeatBar.tsx
#   - AnimatedNumber.tsx
```

**驗收標準**：
- [ ] 打開網站已是深色侘寂風
- [ ] 字體已套用
- [ ] Card 元件有完整 hover 動畫
- [ ] HeatBar 會流動

#### Day 3-4：呱呱元件

```tsx
// components/Quack/QuackAvatar.tsx
// 8 種狀態，先用 emoji 代替
// 之後再換成 SVG

interface QuackProps {
  state: 'calm' | 'thinking' | 'observing' | 'happy' |
         'sleeping' | 'dehydrated' | 'studying' | 'meditating';
  size: 'sm' | 'md' | 'lg';
}

// 各 state 對應的 emoji（先用這個）
const QUACK_EMOJI_MAP = {
  calm: '🦆',
  thinking: '🦆',     // 之後換 SVG
  observing: '🦆',
  happy: '🦆',
  sleeping: '🦆',
  dehydrated: '🦆',
  studying: '🦆',
  meditating: '🦆',
};

// 各 state 對應的動畫
const QUACK_ANIMATIONS = {
  calm: {
    animate: { y: [0, -2, 0] },
    transition: { duration: 4, repeat: Infinity }
  },
  thinking: {
    animate: { rotate: [0, -3, 3, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  // ...其餘狀態
};
```

#### Day 5：浮動呱呱（全站）

```tsx
// components/Quack/QuackFloating.tsx
// 全站右下角固定

// 出現邏輯：
// 1. 每個頁面都有
// 2. 點擊後打開對話框（Day 6 做）
// 3. 會根據情境自動切換表情
// 4. 會「探頭」提醒（設定時間間隔）
```

#### Day 6-7：首頁 Dashboard

按 `11_QUACK_HOUSE_UX_DESIGN.md` 第 6 節實作：

```
/ (app/page.tsx)
├─ Greeting（問候區）
├─ WeatherCard（天氣卡）
├─ QuackTodayCard（呱呱今日功課）
├─ TopicsSection（題材熱度 Top 3）
├─ JournalCard（我的筆記）
└─ BellsCard（小鈴鐺）
```

**驗收標準**：
- [ ] 打開首頁像 `12_QUACK_HOUSE_PROTOTYPE.html` 的效果
- [ ] 所有卡片有進場動畫（淡入上浮）
- [ ] Hover 卡片有浮起效果
- [ ] 熱度條會流動
- [ ] 股價數字會即時更新（3 秒一次）

---

### 🎯 Week 2：資料層建立

#### Day 8：資料庫 Schema

執行 `VSIS_UPGRADE_PLAN.md` 10.2 節的 SQL：

```sql
CREATE TABLE industries (...);
CREATE TABLE topics (...);
CREATE TABLE stocks (...);
CREATE TABLE ecosystems (...);
CREATE TABLE news (...);
CREATE TABLE data_sources (...);
```

#### Day 9：匯入初始資料

```bash
# 匯入 3 個 JSON 檔：
python scripts/import_industries.py < INDUSTRIES_DATA.json
python scripts/import_topics.py < TOPICS_DATA.json
python scripts/import_ecosystems.py < ECOSYSTEMS_DATA.json
```

#### Day 10-11：API 端點建立

```
POST/GET /api/topics           # 題材列表
GET /api/topics/[id]           # 題材詳情
GET /api/industries            # 產業列表
GET /api/industries/[id]       # 產業詳情
GET /api/ecosystems/[ticker]   # 龍頭生態系
GET /api/stocks/[ticker]       # 個股（保留現有，擴充欄位）
```

**重要**：
- ✅ 保留所有現有 VSIS API
- ✅ 新 API 加「v2」前綴避免衝突
- ✅ 不要動 FinMind、FMP 串接

#### Day 12-14：Cron Job 設定

```python
# scripts/cron/
# - daily_0600.py   # 盤前資料更新
# - daily_1430.py   # 盤後評分
# - daily_1800.py   # 公開資訊觀測站
# - daily_2100.py   # 美股 & 國際新聞
```

---

### 🎯 Week 3：池塘頁（題材）

#### Day 15-17：題材列表頁

```
/pond (app/pond/page.tsx)
└─ 所有題材排行（熱度排序）
   ├─ 搜尋欄（可按產業篩選）
   ├─ 題材卡片列表
   └─ 分頁
```

#### Day 18-21：題材詳情頁

```
/pond/[topicId] (app/pond/[topicId]/page.tsx)
├─ 催化劑時間軸（垂直）
├─ 供應鏈金字塔視覺化（先用 CSS 做，後面換 D3）
├─ 題材相關個股列表（可排序）
└─ 呱呱策略建議卡
```

**參考檔案**：`UI_COMPONENTS_GUIDE.md` 的供應鏈視覺化範例

---

### 🎯 Week 4：筆記頁與呱呱對話

#### Day 22-24：我的筆記頁

```
/journal
├─ Tabs：全部 / 持有 / 觀察 / 已出
├─ 持股卡片（含 R:R、目標價、停損）
├─ 觀察卡片
└─ 新增按鈕
```

#### Day 25-28：呱呱對話面板

```tsx
// components/Quack/QuackChatPanel.tsx
// 浮動面板（不是頁面）

// 功能：
// 1. 快速問題按鈕（今日重點、題材、我持股、大盤）
// 2. 自由輸入
// 3. 整合 Claude API（串 AI_ANALYST_PROMPT.md）
// 4. 訊息歷史
// 5. 可最小化
```

---

### 🎯 Week 5-6：龍頭生態系與產業地圖

#### Day 29-32：龍頭生態系頁

```
/pond/ecosystem/[ticker]
├─ 視圖切換：網狀圖 / 樹狀圖 / 矩陣
├─ D3.js 關聯圖（主視覺）
└─ 預期效益矩陣表
```

#### Day 33-35：產業地圖頁

```
/map
└─ 三層下鑽
   ├─ 大類（10 個）
   ├─ 子產業（50+ 個）
   └─ 題材 + 個股
```

---

### 🎯 Week 7-8：互動巧思與優化

#### Day 36-40：隱藏巧思

按 `11_QUACK_HOUSE_UX_DESIGN.md` 第 9 節實作：

**必做**：
- [ ] 時間相關巧思（早安/晚安/盤前/盤中）
- [ ] 市場狀態對應呱呱表情
- [ ] 股價跳動動畫（顏色閃一下）
- [ ] 熱度條流動
- [ ] 節氣主題（可選，看有沒有時間）

**選做**：
- [ ] 音效系統
- [ ] 彩蛋頁 /tea
- [ ] Ctrl+K 命令面板
- [ ] 連續登入獎勵

#### Day 41-45：最終優化

- [ ] 效能優化（Lighthouse 分數 90+）
- [ ] RWD 測試（手機/平板/電腦）
- [ ] 無障礙（A11y）
- [ ] SEO
- [ ] Bug 修復

---

## 🎨 關鍵元件實作範例

### 1. WeatherCard（天氣卡）

```tsx
// components/Dashboard/WeatherCard.tsx
import { useMarket } from '@/hooks/useMarket';

const WEATHER_MAP = {
  // TAIEX 日漲跌 → 天氣意象
  extremely_up: { icon: '☀️', text: '烈日當空', temp: 90 },
  up: { icon: '🌤️', text: '晴時多雲', temp: 72 },
  flat: { icon: '⛅', text: '多雲', temp: 50 },
  down: { icon: '🌥️', text: '陰天', temp: 30 },
  extremely_down: { icon: '🌧️', text: '下雨', temp: 10 },
};

export const WeatherCard = () => {
  const { data: market } = useMarket();

  const weather = useMemo(() => {
    if (!market) return WEATHER_MAP.flat;
    const pct = market.changePercent;
    if (pct > 2) return WEATHER_MAP.extremely_up;
    if (pct > 0.5) return WEATHER_MAP.up;
    if (pct > -0.5) return WEATHER_MAP.flat;
    if (pct > -2) return WEATHER_MAP.down;
    return WEATHER_MAP.extremely_down;
  }, [market]);

  return (
    <Card className="weather-card">
      <CardHeader title="今日池塘" icon="🌤️" />
      <div className="weather-main">{weather.text}</div>
      <div className="weather-temp">{weather.temp}°</div>
      <div className="weather-taiex">
        <span>{market?.value}</span>
        <AnimatedNumber value={market?.changePercent} />
      </div>
      {/* 底部水波紋動畫 */}
      <div className="ripple" />
    </Card>
  );
};
```

### 2. HeatBar（熱度條）

```tsx
// components/ui/HeatBar.tsx
interface HeatBarProps {
  value: number; // 0-100
  animated?: boolean;
}

export const HeatBar = ({ value, animated = true }: HeatBarProps) => {
  const color = useMemo(() => {
    if (value >= 90) return 'var(--heat-extreme)';
    if (value >= 70) return 'var(--heat-high)';
    if (value >= 50) return 'var(--heat-medium)';
    return 'var(--heat-low)';
  }, [value]);

  return (
    <div className="heat-bar">
      <motion.div
        className={`heat-bar-fill ${animated ? 'animated' : ''}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ background: color }}
      />
    </div>
  );
};
```

### 3. AnimatedPrice（股價跳動）

```tsx
// components/ui/AnimatedPrice.tsx
import { useEffect, useState } from 'react';

export const AnimatedPrice = ({ price }: { price: number }) => {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [flashColor, setFlashColor] = useState('');

  useEffect(() => {
    if (price > displayPrice) {
      setFlashColor('var(--rise-light)');
    } else if (price < displayPrice) {
      setFlashColor('var(--fall-light)');
    }
    setDisplayPrice(price);

    const timer = setTimeout(() => setFlashColor(''), 400);
    return () => clearTimeout(timer);
  }, [price]);

  return (
    <span
      className="animated-price"
      style={{
        color: flashColor || 'var(--text-primary)',
        transition: 'color 0.4s',
      }}
    >
      {displayPrice.toFixed(2)}
    </span>
  );
};
```

### 4. QuackAvatar（呱呱頭像）

```tsx
// components/Quack/QuackAvatar.tsx
import { motion } from 'framer-motion';

type QuackState = 'calm' | 'thinking' | 'observing' | 'happy' |
                   'sleeping' | 'dehydrated' | 'studying' | 'meditating';

const ANIMATIONS: Record<QuackState, any> = {
  calm: {
    animate: { y: [0, -2, 0] },
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
  },
  thinking: {
    animate: { rotate: [0, -3, 3, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  observing: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.5, repeat: Infinity }
  },
  happy: {
    animate: { y: [0, -10, 0], rotate: [0, -5, 5, 0] },
    transition: { duration: 0.8, repeat: Infinity }
  },
  sleeping: {
    animate: { opacity: [1, 0.6, 1] },
    transition: { duration: 3, repeat: Infinity }
  },
  dehydrated: {
    animate: { y: [0, 2, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  studying: {
    animate: { rotate: [-2, 2, -2] },
    transition: { duration: 3, repeat: Infinity }
  },
  meditating: {
    animate: {},
    transition: {}
  },
};

const SIZES = {
  sm: '24px',
  md: '48px',
  lg: '96px',
  xl: '160px',
};

export const QuackAvatar = ({
  state = 'calm',
  size = 'md',
  onClick
}: {
  state?: QuackState;
  size?: keyof typeof SIZES;
  onClick?: () => void;
}) => {
  return (
    <motion.div
      className="quack-avatar"
      style={{
        fontSize: SIZES[size],
        display: 'inline-block',
        cursor: onClick ? 'pointer' : 'default',
      }}
      {...ANIMATIONS[state]}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.1 } : undefined}
    >
      🦆
    </motion.div>
  );
};
```

---

## 📁 專案結構建議

```
app/
├─ (main)/
│  ├─ page.tsx                    # 首頁 Dashboard
│  ├─ pond/
│  │  ├─ page.tsx                 # 池塘列表
│  │  ├─ [topicId]/page.tsx       # 題材詳情
│  │  └─ ecosystem/[ticker]/page.tsx  # 龍頭生態系
│  ├─ journal/
│  │  ├─ page.tsx                 # 我的筆記
│  │  └─ [ticker]/page.tsx        # 個股詳情
│  ├─ map/page.tsx                # 產業地圖
│  ├─ market/page.tsx             # 市場全景（保留現有）
│  └─ tools/
│     ├─ backtest/page.tsx
│     ├─ paper/page.tsx
│     └─ alerts/page.tsx
├─ api/
│  ├─ topics/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ ecosystems/[ticker]/route.ts
│  ├─ stocks/[ticker]/route.ts    # 保留現有
│  └─ quack/chat/route.ts         # 新：AI 分析師
└─ layout.tsx                     # 全局 layout（含 QuackFloating）

components/
├─ ui/                # 基礎元件
│  ├─ Card.tsx
│  ├─ Button.tsx
│  ├─ HeatBar.tsx
│  ├─ AnimatedNumber.tsx
│  └─ AnimatedPrice.tsx
├─ Quack/             # 呱呱相關
│  ├─ QuackAvatar.tsx
│  ├─ QuackFloating.tsx
│  ├─ QuackChatPanel.tsx
│  └─ QuackSpeech.tsx
├─ Dashboard/         # 首頁元件
│  ├─ WeatherCard.tsx
│  ├─ QuackTodayCard.tsx
│  ├─ TopicsSection.tsx
│  ├─ JournalCard.tsx
│  └─ BellsCard.tsx
├─ Pond/              # 池塘頁元件
│  ├─ TopicCard.tsx
│  ├─ CatalystTimeline.tsx
│  ├─ SupplyChainPyramid.tsx
│  └─ EcosystemGraph.tsx
└─ Journal/
   ├─ StockCard.tsx
   └─ WatchingCard.tsx

lib/
├─ api/               # API Client
├─ db/                # Database queries
├─ schedulers/        # Cron jobs
└─ claude/            # Claude API wrapper

hooks/
├─ useStock.ts
├─ useTopics.ts
├─ useMarket.ts
└─ useQuack.ts
```

---

## 🎯 每個 Phase 的驗收清單

### Phase 1 驗收（Week 1-2）
- [ ] 打開網站是侘寂深色風格
- [ ] 字體、配色、間距統一
- [ ] 首頁 5 個核心卡片全做好
- [ ] 浮動呱呱能點開
- [ ] 資料庫 Schema 建好
- [ ] 初始資料匯入完成
- [ ] 所有新 API 可正常回傳
- [ ] Cron Job 至少一個跑起來

### Phase 2 驗收（Week 3-4）
- [ ] /pond 能看到所有題材
- [ ] 點題材能看詳情頁（含供應鏈）
- [ ] /journal 能管理自選
- [ ] 呱呱對話可以問答（串 Claude API）
- [ ] RWD 手機版完整

### Phase 3 驗收（Week 5-6）
- [ ] /pond/ecosystem/[ticker] 有網狀圖
- [ ] /map 三層下鑽能用
- [ ] 預期效益矩陣表格完整
- [ ] 所有視覺化元件流暢

### Phase 4 驗收（Week 7-8）
- [ ] 所有隱藏巧思都有
- [ ] 節氣主題（至少春夏秋冬各 1 個）
- [ ] 效能 Lighthouse 90+
- [ ] 所有頁面 RWD 通過
- [ ] Vincent 試用認可

---

## 🎯 遇到問題怎麼辦

### Q1：規劃沒寫到的需求
→ **問 Vincent**，不要自己決定

### Q2：某個 UI 做不出侘寂感
→ 回頭看 `12_QUACK_HOUSE_PROTOTYPE.html`，照那個做

### Q3：呱呱 SVG 還沒做好
→ 先用 emoji 代替，**全站一致**就好

### Q4：API 串接遇到問題
→ **不要改 API**，改前端 adapter

### Q5：動畫效能不好
→ 簡化動畫，侘寂風本來就不需要太多動效

### Q6：Vincent 臨時改需求
→ 評估影響範圍，提出「做 / 不做 / 延後」三個選項

---

## 🎁 最後的話

### 給 Claude Code：

這個專案 Vincent 很在意，他要的不是一個「會動的網站」，
而是一個**有靈魂的產品**。

- **呱呱不是裝飾**：是產品的核心人格
- **侘寂不是美學**：是給進階投資人「靜下來思考」的空間
- **細節不是炫技**：是讓使用者「覺得被理解」的溫柔

請用**打造產品**的心態做這個，不要用「交作業」的心態。

Vincent 相信你。加油 💪

---

**文件版本**：v1.0
**建立日期**：2026-04-23
**交付對象**：Claude Code
