# 🎨 VSIS 視覺化元件完整實作指南

> 本文件包含 VSIS 系統所有關鍵視覺化元件的實作範例。Claude Code 可以直接複製改寫使用。

---

## 📋 元件清單

1. [首頁：市場溫度計](#1-市場溫度計)
2. [首頁：題材熱度 TOP 5 卡片](#2-題材熱度卡片)
3. [首頁：供應鏈金字塔](#3-供應鏈金字塔)
4. [首頁：焦點個股表格](#4-焦點個股表格)
5. [題材頁：供應鏈分層視覺化](#5-供應鏈分層視覺化)
6. [龍頭頁：網狀關聯圖](#6-網狀關聯圖)
7. [龍頭頁：預期效益矩陣](#7-預期效益矩陣)
8. [個股頁：四象限評分雷達圖](#8-四象限雷達圖)
9. [AI 分析師對話介面](#9-ai-對話介面)

---

## 1. 市場溫度計

### 設計概念
一個大的半圓形儀表板，0-100 分顯示當前市場溫度。

### 技術選擇
- **D3.js**（最靈活）
- **react-gauge-chart**（最快上手）

### 實作範例

```jsx
// components/MarketThermometer.jsx
import GaugeChart from 'react-gauge-chart';

export default function MarketThermometer({ score = 68 }) {
  // 分級顏色
  const getColor = (score) => {
    if (score < 30) return '#EF4444'; // 冷（紅）
    if (score < 50) return '#F59E0B'; // 偏冷（橘）
    if (score < 70) return '#10B981'; // 中性（綠）
    if (score < 85) return '#3B82F6'; // 偏熱（藍）
    return '#8B5CF6'; // 極熱（紫）
  };

  const getLabel = (score) => {
    if (score < 30) return '冷清';
    if (score < 50) return '謹慎';
    if (score < 70) return '平衡';
    if (score < 85) return '活躍';
    return '過熱 ⚠️';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">🌡️ 市場溫度計</h2>
        <span className="text-sm text-gray-400">即時更新</span>
      </div>

      <GaugeChart
        id="market-thermometer"
        nrOfLevels={5}
        colors={['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']}
        arcWidth={0.3}
        percent={score / 100}
        textColor="#FFFFFF"
        formatTextValue={(value) => `${value}`}
      />

      <div className="mt-4 text-center">
        <div className="text-3xl font-bold text-white">{getLabel(score)}</div>
        <div className="mt-2 text-sm text-gray-400">
          台股加權指數 | 外資 | 融資 | 量能
        </div>
      </div>

      {/* 細項分數 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <ScoreBreakdown label="加權指數" value={72} />
        <ScoreBreakdown label="外資" value={65} />
        <ScoreBreakdown label="融資" value={58} />
        <ScoreBreakdown label="量能" value={75} />
      </div>
    </div>
  );
}

function ScoreBreakdown({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
```

---

## 2. 題材熱度卡片

### 設計概念
TOP 5 題材橫向卡片列表，熱度用「溫度條」顯示。

### 實作範例

```jsx
// components/TopicsHeatCard.jsx
import { useRouter } from 'next/router';

export default function TopicsHeatCard({ topics }) {
  const router = useRouter();

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">🔥 今日題材熱度 TOP 5</h2>
        <button className="text-sm text-blue-400">查看全部 →</button>
      </div>

      <div className="space-y-3">
        {topics.slice(0, 5).map((topic, i) => (
          <div
            key={topic.id}
            onClick={() => router.push(`/topics/${topic.id}`)}
            className="flex items-center bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-all"
          >
            {/* 名次 */}
            <div className="text-2xl mr-4">{medals[i]}</div>

            {/* 題材資訊 */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">{topic.name}</span>
                <span className="text-sm text-gray-400">
                  {topic.heat_score}° {getHeatIcon(topic.heat_trend)}
                </span>
              </div>

              {/* 熱度條 */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${topic.heat_score}%` }}
                />
              </div>

              {/* 代表股 */}
              <div className="mt-2 text-xs text-gray-400">
                {topic.supply_chain.tier_1_raw_materials?.stocks.slice(0, 3).map(s => (
                  <span key={s} className="mr-2">{s}</span>
                ))}
              </div>
            </div>

            {/* 箭頭 */}
            <div className="ml-4 text-gray-400">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getHeatIcon(trend) {
  if (trend === 'rising') return '▲';
  if (trend === 'falling') return '▼';
  return '→';
}
```

---

## 3. 供應鏈金字塔

### 設計概念
從上而下的金字塔結構，顯示供應鏈階層。每一層代表一個階段，寬度代表家數。

### 技術選擇
- **純 CSS + Flexbox**（簡單）
- **SVG**（最靈活）
- **react-force-graph**（若要互動）

### 實作範例（純 CSS 版）

```jsx
// components/SupplyChainPyramid.jsx
export default function SupplyChainPyramid({ chainData }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">📊 AI 供應鏈金字塔</h2>

      <div className="space-y-2">
        {chainData.tiers.map((tier, i) => {
          // 寬度從 30% 開始遞增
          const width = 30 + i * 12;

          return (
            <div
              key={tier.name}
              className="mx-auto rounded-lg p-4 transition-all hover:scale-105"
              style={{
                width: `${width}%`,
                background: tier.is_hot
                  ? 'linear-gradient(to right, #F59E0B, #EF4444)'
                  : 'linear-gradient(to right, #374151, #4B5563)'
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-sm">
                  Level {i + 1}: {tier.name}
                </span>
                {tier.is_hot && (
                  <span className="text-yellow-300 text-xs animate-pulse">🔥 熱戰區</span>
                )}
              </div>

              <div className="mt-2 text-xs text-white opacity-80">
                {tier.stocks.slice(0, 4).map(s => s).join(' · ')}
                {tier.stocks.length > 4 && ' ...'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        💡 資金通常從上游（左方）流向下游（右方），或反向補漲
      </div>
    </div>
  );
}

// 資料範例
const aiChainData = {
  tiers: [
    { name: "AI 晶片", stocks: ["NVIDIA"], is_hot: false },
    { name: "晶圓代工", stocks: ["2330 台積電"], is_hot: false },
    { name: "封測+ABF", stocks: ["3711 日月光", "3037 欣興"], is_hot: false },
    { name: "PCB", stocks: ["4958 臻鼎", "3044 健鼎"], is_hot: false },
    { name: "CCL 銅箔基板", stocks: ["2383 台光電", "6274 台燿"], is_hot: false },
    { name: "玻纖布+銅箔", stocks: ["1815 富喬", "8358 金居"], is_hot: true },
    { name: "樹脂材料 🔥", stocks: ["4722 國精化", "4764 雙鍵"], is_hot: true },
  ]
};
```

---

## 4. 焦點個股表格

### 設計概念
可排序、可篩選的表格，顯示每檔股票的熱度 + 評分 + 建議。

### 實作範例

```jsx
// components/FocusStocksTable.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function FocusStocksTable({ stocks }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState('heat');
  const [filter, setFilter] = useState('all'); // all, buy, avoid

  const sortedStocks = [...stocks].sort((a, b) => {
    if (sortBy === 'heat') return b.heat_score - a.heat_score;
    if (sortBy === 'vsis') return b.vsis_score.total - a.vsis_score.total;
    if (sortBy === 'change') return b.daily_change_pct - a.daily_change_pct;
    return 0;
  });

  const filteredStocks = sortedStocks.filter(s => {
    if (filter === 'buy') return s.recommendation === 'buy';
    if (filter === 'avoid') return s.recommendation === 'avoid';
    return true;
  });

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">💎 今日焦點個股</h2>

        {/* 篩選 */}
        <div className="flex gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            全部
          </FilterButton>
          <FilterButton active={filter === 'buy'} onClick={() => setFilter('buy')}>
            ✅ 可買
          </FilterButton>
          <FilterButton active={filter === 'avoid'} onClick={() => setFilter('avoid')}>
            ⚠️ 避開
          </FilterButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-2">排名</th>
              <th className="pb-2">股號</th>
              <th className="pb-2">股名</th>
              <th
                className="pb-2 cursor-pointer hover:text-white"
                onClick={() => setSortBy('heat')}
              >
                熱度 {sortBy === 'heat' && '↓'}
              </th>
              <th
                className="pb-2 cursor-pointer hover:text-white"
                onClick={() => setSortBy('vsis')}
              >
                VSIS {sortBy === 'vsis' && '↓'}
              </th>
              <th
                className="pb-2 cursor-pointer hover:text-white"
                onClick={() => setSortBy('change')}
              >
                漲跌% {sortBy === 'change' && '↓'}
              </th>
              <th className="pb-2">建議</th>
              <th className="pb-2">週期</th>
            </tr>
          </thead>

          <tbody>
            {filteredStocks.slice(0, 15).map((stock, i) => (
              <tr
                key={stock.ticker}
                className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
                onClick={() => router.push(`/stocks/${stock.ticker}`)}
              >
                <td className="py-3 text-white">{i + 1}</td>
                <td className="py-3 text-white font-mono">{stock.ticker}</td>
                <td className="py-3 text-white">{stock.name}</td>
                <td className="py-3">
                  <HeatBadge score={stock.heat_score} />
                </td>
                <td className="py-3">
                  <VSISBadge score={stock.vsis_score.total} />
                </td>
                <td className="py-3">
                  <span className={stock.daily_change_pct >= 0 ? 'text-red-400' : 'text-green-400'}>
                    {stock.daily_change_pct >= 0 ? '+' : ''}
                    {stock.daily_change_pct.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3">
                  <RecommendationBadge rec={stock.recommendation} />
                </td>
                <td className="py-3 text-sm text-gray-400">
                  {getHoldingPeriod(stock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeatBadge({ score }) {
  const color = score >= 80 ? 'bg-red-500' :
                score >= 60 ? 'bg-orange-500' :
                score >= 40 ? 'bg-yellow-500' : 'bg-gray-500';
  return (
    <span className={`${color} text-white px-2 py-1 rounded text-xs font-semibold`}>
      {score}°
    </span>
  );
}

function VSISBadge({ score }) {
  const color = score >= 80 ? 'text-green-400' :
                score >= 60 ? 'text-blue-400' :
                score >= 40 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`${color} font-bold`}>{score}/95</span>;
}

function RecommendationBadge({ rec }) {
  const config = {
    'buy': { emoji: '✅', text: '買', color: 'bg-green-500' },
    'wait': { emoji: '🟡', text: '等', color: 'bg-yellow-500' },
    'avoid': { emoji: '⚠️', text: '避', color: 'bg-red-500' },
  };
  const c = config[rec] || config.wait;
  return (
    <span className={`${c.color} text-white px-2 py-1 rounded text-xs font-semibold`}>
      {c.emoji} {c.text}
    </span>
  );
}
```

---

## 5. 供應鏈分層視覺化（題材頁）

### 設計概念
題材底下的股票按「上游 → 中游 → 下游」分層顯示，每層可收合。

### 實作範例

```jsx
// components/TopicSupplyChainLayers.jsx
import { useState } from 'react';

export default function TopicSupplyChainLayers({ topic }) {
  const [expandedTier, setExpandedTier] = useState('all');

  const tiers = Object.entries(topic.supply_chain);

  return (
    <div className="space-y-4">
      {tiers.map(([tierKey, tierData]) => (
        <div
          key={tierKey}
          className="bg-gray-900 rounded-xl p-4"
        >
          <div
            className="flex justify-between items-center cursor-pointer mb-3"
            onClick={() => setExpandedTier(
              expandedTier === tierKey ? null : tierKey
            )}
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {getTierIcon(tierKey)} {tierData.name}
              <StatusBadge status={tierData.status} />
            </h3>
            <span className="text-gray-400">
              {expandedTier === tierKey ? '−' : '+'}
            </span>
          </div>

          {(expandedTier === tierKey || expandedTier === 'all') && (
            <StockListGrid stocks={tierData.stocks} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    '主升段': 'bg-red-600 text-white',
    '補漲': 'bg-orange-500 text-white',
    '已漲': 'bg-blue-500 text-white',
    '穩定': 'bg-gray-500 text-white',
    '早期': 'bg-green-500 text-white',
  };
  return (
    <span className={`${config[status]} px-2 py-1 rounded text-xs ml-2`}>
      {status}
    </span>
  );
}

function getTierIcon(tierKey) {
  const icons = {
    'tier_1_raw_materials': '🌱',
    'tier_2_ccl': '⚙️',
    'tier_3_resin': '🧪',
    'tier_4_pcb': '🔧',
    'tier_1_abf_substrate': '📀',
    'tier_2_equipment': '🔬',
    'tier_3_packaging': '📦',
    'tier_4_materials': '🧬'
  };
  return icons[tierKey] || '📊';
}
```

---

## 6. 網狀關聯圖（龍頭生態系）

### 設計概念
中心節點是龍頭，向外輻射到客戶、供應商、競爭對手。點擊任一節點跳轉。

### 技術選擇
- **react-force-graph**（最適合，內建互動）
- **D3.js**（最靈活，要自己寫）

### 實作範例

```jsx
// components/EcosystemNetworkGraph.jsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// react-force-graph 需要 dynamic import（只在 client side）
const ForceGraph2D = dynamic(() =>
  import('react-force-graph').then(mod => mod.ForceGraph2D),
  { ssr: false }
);

export default function EcosystemNetworkGraph({ ecosystem }) {
  const router = useRouter();

  const graphData = buildGraphData(ecosystem);

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        🏆 {ecosystem.anchor_name} 生態系
      </h2>

      <ForceGraph2D
        graphData={graphData}
        backgroundColor="#111827"
        nodeLabel={node => `${node.label}\n${node.description || ''}`}
        nodeVal={node => node.val}
        nodeColor={node => node.color}
        linkColor={() => '#4B5563'}
        linkWidth={link => Math.sqrt(link.value) * 0.5}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        onNodeClick={node => {
          if (node.ticker) {
            router.push(`/stocks/${node.ticker}`);
          } else if (node.type === 'ecosystem') {
            router.push(`/ecosystem/${node.id}`);
          }
        }}
        width={1000}
        height={600}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;

          // 畫圓
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
          ctx.fill();

          // 畫文字
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, node.x, node.y + node.val + 6);
        }}
      />

      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <LegendItem color="#EF4444" label="龍頭" />
        <LegendItem color="#10B981" label="客戶" />
        <LegendItem color="#3B82F6" label="供應商" />
        <LegendItem color="#F59E0B" label="競爭對手" />
      </div>
    </div>
  );
}

function buildGraphData(ecosystem) {
  const nodes = [
    // 中心：龍頭
    {
      id: ecosystem.anchor_ticker,
      label: `${ecosystem.anchor_ticker}\n${ecosystem.anchor_name}`,
      val: 25,
      color: '#EF4444',
      type: 'anchor'
    },

    // 客戶（綠）
    ...ecosystem.customers.map(c => ({
      id: c.name,
      label: c.name,
      val: 10 + (c.importance || 5),
      color: '#10B981',
      type: 'customer',
      description: `客戶 | 營收佔比: ${c.revenue_share_pct || 'N/A'}%`
    })),

    // 供應商（藍）
    ...(ecosystem.suppliers || []).flatMap(s =>
      (s.vendor_names || [s.vendor_name]).map(name => ({
        id: name,
        label: name,
        val: 8,
        color: '#3B82F6',
        type: 'supplier',
        description: `供應商 | 類別: ${s.category}`
      }))
    ),

    // 競爭對手（橘）
    ...(ecosystem.competitors || []).map(c => ({
      id: c.name,
      label: c.name,
      val: 8,
      color: '#F59E0B',
      type: 'competitor',
      description: `競爭對手 | 市佔: ${c.market_share_pct || 'N/A'}%`
    })),
  ];

  const links = [
    // 客戶 → 龍頭（買東西）
    ...ecosystem.customers.map(c => ({
      source: c.name,
      target: ecosystem.anchor_ticker,
      value: c.revenue_share_pct || 5
    })),

    // 供應商 → 龍頭（供貨）
    ...(ecosystem.suppliers || []).flatMap(s =>
      (s.vendor_names || [s.vendor_name]).map(name => ({
        source: name,
        target: ecosystem.anchor_ticker,
        value: s.strategic_importance === 'critical' ? 10 : 5
      }))
    ),

    // 競爭對手（雙向）
    ...(ecosystem.competitors || []).map(c => ({
      source: ecosystem.anchor_ticker,
      target: c.name,
      value: 3
    })),
  ];

  return { nodes, links };
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-white text-xs">{label}</span>
    </div>
  );
}
```

**安裝**：
```bash
npm install react-force-graph
```

---

## 7. 預期效益矩陣

### 設計概念
顯示「龍頭成長 → 受惠股預期」的表格，包含彈性、EPS、合理價、上漲空間。

### 實作範例

```jsx
// components/BenefitMatrix.jsx
export default function BenefitMatrix({ beneficiaryStocks }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        💰 預期效益矩陣
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3">個股</th>
              <th className="pb-3 text-center">關聯度</th>
              <th className="pb-3 text-center">彈性</th>
              <th className="pb-3 text-right">現價</th>
              <th className="pb-3 text-right">合理價</th>
              <th className="pb-3 text-right">上漲空間</th>
              <th className="pb-3 text-center">建議</th>
            </tr>
          </thead>

          <tbody>
            {beneficiaryStocks.map(stock => (
              <tr key={stock.ticker} className="border-b border-gray-800 hover:bg-gray-800">
                <td className="py-3">
                  <div className="text-white font-semibold">{stock.ticker}</div>
                  <div className="text-xs text-gray-400">{stock.name}</div>
                  <div className="text-xs text-gray-500">{stock.category}</div>
                </td>

                <td className="py-3 text-center">
                  <CorrelationBar pct={stock.correlation_pct} />
                </td>

                <td className="py-3 text-center">
                  <ElasticityBadge grade={stock.elasticity_grade} />
                </td>

                <td className="py-3 text-right text-white">
                  ${stock.current_price || 'N/A'}
                </td>

                <td className="py-3 text-right text-green-400 font-semibold">
                  ${stock.target_price || stock.fair_value}
                </td>

                <td className="py-3 text-right">
                  <UpsideBadge
                    current={stock.current_price}
                    target={stock.target_price || stock.fair_value}
                  />
                </td>

                <td className="py-3 text-center">
                  {stock.hidden_champion && <span className="text-yellow-400">💎</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        💡 彈性 = 當龍頭營收成長 1 倍時，這檔受惠股 EPS 成長倍數
      </div>
    </div>
  );
}

function CorrelationBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

function ElasticityBadge({ grade }) {
  const config = {
    'A+': { color: 'bg-red-500', icon: '🔥🔥🔥' },
    'A': { color: 'bg-orange-500', icon: '🔥🔥' },
    'B+': { color: 'bg-yellow-500', icon: '🔥' },
    'B': { color: 'bg-green-500', icon: '📈' },
    'C': { color: 'bg-gray-500', icon: '➡️' },
  };
  const c = config[grade] || config.C;
  return (
    <span className={`${c.color} text-white px-2 py-1 rounded text-xs`}>
      {c.icon} {grade}
    </span>
  );
}

function UpsideBadge({ current, target }) {
  if (!current || !target) return <span className="text-gray-400">N/A</span>;
  const upside = ((target - current) / current * 100).toFixed(1);
  const color = upside > 30 ? 'text-green-400' :
                upside > 10 ? 'text-blue-400' : 'text-yellow-400';
  return <span className={`${color} font-bold`}>+{upside}%</span>;
}
```

---

## 8. 四象限雷達圖

### 設計概念
用 Recharts 的 RadarChart 顯示 VSIS 四象限評分。

### 實作範例

```jsx
// components/VSISRadarChart.jsx
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function VSISRadarChart({ vsis_score }) {
  const data = [
    { subject: '基本面', value: vsis_score.fundamental, fullMark: 20 },
    { subject: '籌碼面', value: vsis_score.chips, fullMark: 20 },
    { subject: '技術面', value: vsis_score.technical, fullMark: 20 },
    { subject: '題材面', value: vsis_score.theme, fullMark: 20 },
    { subject: '市場調整', value: vsis_score.market_adjustment, fullMark: 15 },
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">📊 VSIS 四象限評分</h3>
        <span className="text-2xl font-bold text-white">{vsis_score.total}/95</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 20]}
            tick={{ fill: '#6B7280', fontSize: 10 }}
          />
          <Radar
            name="評分"
            dataKey="value"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
        {data.map(d => (
          <div key={d.subject}>
            <div className="text-gray-400">{d.subject}</div>
            <div className="text-white font-bold">
              {d.value}/{d.fullMark}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 9. AI 對話介面

### 設計概念
像 Claude 這樣的對話介面，支援 Markdown 渲染、股票快速卡片、表格。

### 實作範例

```jsx
// components/AIAnalystChat.jsx
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIAnalystChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `你好 Vincent！今天盤面 CCL 題材最熱，我建議優先看 3 檔補漲股。

**快速選項**：
- [分析整條 CCL 供應鏈]
- [推薦 1 週內可操作標的]
- [深入某檔個股]
- [比較 2 檔誰更值得買]

或直接問我任何問題，我會給你：
- ✓ 具體分析（不模稜兩可）
- ✓ 數據來源（新聞連結）
- ✓ 操作建議（買賣點、停損）
- ✓ 風險提示（反對論點）`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          user_id: 'vincent'
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ 抱歉出錯了，請稍後再試。'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* 標題列 */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
          <div>
            <div className="text-white font-semibold">VSIS Analyst</div>
            <div className="text-xs text-gray-400">專業台股分析師</div>
          </div>
        </div>
      </div>

      {/* 對話內容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入框 */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="問我任何台股問題..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-4 ${
        isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
      }`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // 自訂表格樣式
            table: ({ children }) => (
              <table className="border-collapse border border-gray-600 my-2">
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th className="border border-gray-600 px-3 py-1 bg-gray-700">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-600 px-3 py-1">
                {children}
              </td>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 套件清單

```json
// package.json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0",
    "tailwindcss": "^3.0.0",
    "recharts": "^2.10.0",
    "react-force-graph": "^1.44.0",
    "react-gauge-chart": "^0.4.1",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

---

## 🎨 設計系統建議

### 顏色規範

```javascript
const colors = {
  background: '#111827',     // 主背景（深黑藍）
  cardBg: '#1F2937',         // 卡片背景
  border: '#374151',         // 邊框
  textPrimary: '#F9FAFB',    // 主文字（白）
  textSecondary: '#9CA3AF',  // 次文字（灰）

  // 語意色
  bullish: '#EF4444',        // 漲（紅 - 台股習慣）
  bearish: '#10B981',        // 跌（綠 - 台股習慣）
  warning: '#F59E0B',        // 警告（橘）
  info: '#3B82F6',           // 資訊（藍）

  // 熱度色階
  heat: {
    cold: '#3B82F6',
    cool: '#10B981',
    warm: '#F59E0B',
    hot: '#F97316',
    extreme: '#EF4444'
  }
};
```

### 字體

```css
/* Apple 系統字體 + 台灣使用 */
font-family: -apple-system, BlinkMacSystemFont, "PingFang TC",
             "Noto Sans TC", sans-serif;
```

---

**文件結束**
