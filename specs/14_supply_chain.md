# 🔗 供應鏈視覺化規格書

> Vincent 原話:
> 「我在這個系統我可以看到相關供應鏈的完整從頭到尾的流程圖」

---

## 🎯 為什麼需要供應鏈圖?

**實戰情境:**

- Nvidia 公布新 GPU → 你知道「台積電受惠」
- 但**誰又受惠 Nvidia?** 光罩廠、散熱廠、載板廠、伺服器廠?
- 誰受惠台積電 → 設備廠、光阻劑、矽晶圓廠?

**沒供應鏈圖 → 只看得到表面**
**有供應鏈圖 → 看得到整條金流**

---

## 🌳 三層供應鏈結構

### 層級 1:上游(Upstream)— 原料、設備
### 層級 2:中游(Midstream)— 製造、代工
### 層級 3:下游(Downstream)— 品牌、通路

**範例:AI 伺服器供應鏈**

```
┌─ 上游(關鍵原料)─────────────────────────┐
│ 矽晶圓     環球晶 6488                    │
│ 光阻劑     崇越 5434                      │
│ 特殊氣體   聯華 1229                      │
│ EDA 工具   Cadence (美), Synopsys (美)   │
│ 微影設備   ASML (荷), AMEC (中)          │
└──────────────────────┬──────────────────┘
                       │
┌─ 中游(晶片製造)──────▼─────────────────┐
│ 晶片設計   NVDA, AMD, 聯發科 2454        │
│ 晶圓代工   台積電 2330 ⭐                │
│ 封測      日月光 3711                    │
│ IP 矽智財  創意 3443                     │
└──────────────────────┬──────────────────┘
                       │
┌─ 中游(模組)─────────▼─────────────────┐
│ CCL 銅箔  台光電 2383                    │
│ 載板      欣興 3037, 南電 8046           │
│ PCB       健鼎 3044                      │
│ 散熱      奇鋐 3017, 雙鴻 3324           │
│ 連接器    嘉澤 3533                      │
│ 電源      台達電 2308                    │
└──────────────────────┬──────────────────┘
                       │
┌─ 下游(伺服器)───────▼─────────────────┐
│ ODM       鴻海 2317 ⭐, 廣達 2382       │
│ OEM/品牌  DELL, HP, Supermicro          │
│ 雲端業者  AWS, GCP, Azure               │
└─────────────────────────────────────────┘
```

---

## 🔧 技術實作

### 資料來源(4 個管道)

```python
class SupplyChainDataSource:
    """
    供應鏈資料的四個來源
    """
    
    # 1. 公開資料:公司年報 / 法說會簡報
    #    台灣公開資訊觀測站下載 PDF
    
    # 2. 新聞:XX 公司成為 YY 供應商
    #    NewsAPI + AI 抽取關係
    
    # 3. 券商研究報告
    #    RSS 或手動輸入
    
    # 4. 社群情報(X 貼文)
    #    Jensen 說 xxx 是我們夥伴
```

### AI 抽取供應鏈關係

```python
async def extract_supply_chain_relationships(
    source_text: str
) -> list[dict]:
    """
    從新聞/法說會文字抽取「誰是誰的供應商」
    """
    prompt = f"""
從下面文字中抽取所有「供應鏈關係」,以 JSON 格式回傳:

文字:
{source_text}

格式:
[
  {{
    "supplier": "供應商公司",
    "supplier_stock_id": "股號(若為上市公司)",
    "customer": "客戶公司",
    "customer_stock_id": "股號(若為上市公司)",
    "product": "產品/服務",
    "relationship_type": "direct_supplier" | "indirect" | "competitor",
    "confidence": 0-100,
    "source_context": "原文片段"
  }}
]
"""
    
    response = await claude_api.complete(prompt)
    return parse_json(response)
```

### 資料庫 schema

```sql
CREATE TABLE supply_chain_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    supplier_stock_id VARCHAR(10),
    supplier_name VARCHAR(100),
    customer_stock_id VARCHAR(10),
    customer_name VARCHAR(100),
    
    product_category VARCHAR(100),
    relationship_type VARCHAR(50),  -- direct_supplier / indirect / competitor
    revenue_share_estimate NUMERIC(5, 2),  -- 此供應商佔客戶比例
    
    confidence INT,  -- 0-100
    
    source_type VARCHAR(50),  -- annual_report, news, analyst_report, social
    source_url TEXT,
    source_date DATE,
    
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supply_supplier ON supply_chain_relationships(supplier_stock_id);
CREATE INDEX idx_supply_customer ON supply_chain_relationships(customer_stock_id);
```

---

## 📱 UI 呈現(三種視圖)

### 視圖 1:**鏈式流程圖**(預設)

```
┌─────────────────────────────────────┐
│ 🔗 鴻海 2317 的供應鏈                │
│ [上游視角] [下游視角] [同業視角]     │
├─────────────────────────────────────┤
│                                     │
│      ⬆️ 上游(鴻海採購)              │
│                                     │
│  🏭 晶片             🔌 零組件       │
│  台積電 2330         台達電 2308    │
│  聯發科 2454         廣達零件        │
│                                     │
│      │             │                │
│      └─────┬───────┘                │
│            ▼                        │
│    ╔═══════════════╗                │
│    ║  鴻海 2317    ║ ⭐ 你在這       │
│    ║  (組裝/ODM)   ║                │
│    ╚═══════┬═══════╝                │
│            │                        │
│      ⬇️ 下游(鴻海客戶)              │
│                                     │
│  🌏 品牌              💻 雲端        │
│  Apple                AWS            │
│  NVIDIA (AI 機櫃)     微軟 Azure    │
│                       Google Cloud  │
│                                     │
│ 💡 洞察:                             │
│ - Nvidia 佔鴻海 AI 伺服器營收約 30%  │
│ - Apple 佔鴻海整體營收約 40%         │
│ - 若 Apple 砍單 → 影響最大           │
│                                     │
└─────────────────────────────────────┘
```

### 視圖 2:**網路圖(Network Graph)**

用 **React Flow** 或 **Cytoscape.js** 畫:

```
特色:
- 可以拖曳、縮放
- 節點顏色代表市值大小
- 連線粗細代表關係強度
- 點擊節點看詳細
```

```
          (AMD)    (Nvidia)
             \      /
              \    /
           [台積電]───[三星]
            / | \
           /  |  \
      [聯電][力積電][世界先進]
         \    |    /
          \   |   /
         [鴻海]──[廣達]──[緯創]
          /  |  \
         /   |   \
      [Apple][HP][Dell]
```

### 視圖 3:**資金流向桑基圖**(Sankey)

顯示「錢從哪流到哪」:

```
外資 ───────┐
            ├───→ 台積電 ───→ 鴻海 ───→ Apple
投信 ───────┘       │
                    ├───→ 聯發科
                    │
                    └───→ 日月光

粗細 = 金流量
顏色 = 類別
```

---

## 🎯 應用場景

### 場景 1:**連鎖效應追蹤**

**Nvidia 公布新品 → 系統自動推:**

```
🚀 連鎖效應分析

Nvidia GB300 發表 (T+0)
   │
   ├─→ 直接受惠(1-3 天反應):
   │   - 台積電 2330(晶圓代工)
   │   - 日月光 3711(先進封裝)
   │
   ├─→ 間接受惠(3-7 天反應):
   │   - 台光電 2383(CCL)
   │   - 欣興 3037(載板)
   │   - 奇鋐 3017(散熱)
   │   
   └─→ 下游機櫃(7-14 天反應):
       - 鴻海 2317
       - 廣達 2382
       - 緯創 3231

建議:若 Nvidia 跳漲 5%+,系統會自動
     標記這些股票的預期動向
```

### 場景 2:**反向追蹤(這檔為何漲?)**

**Vincent 看到某檔漲,系統解釋:**

```
為什麼 3037 欣興今日漲 4.5%?

🔍 供應鏈分析:
 上游影響:正常
 下游影響:
   ✅ Nvidia 昨夜 +3%(主要客戶之一)
   ✅ Apple 下單傳聞(次要客戶)
 同業比較:
   同業南電 8046 漲 5%
   → 整個載板族群受惠

💡 結論:Nvidia 拉動整條載板鏈
```

### 場景 3:**風險傳染預警**

```
🚨 風險傳染警告

重大事件:Apple 宣布砍 iPhone 15 訂單 20%

可能受影響的台股(按衝擊排序):
1. 鴻海 2317  (直接組裝)預計 -3-5%
2. 台積電 2330(A 系列晶片)預計 -1-2%
3. 大立光 3008(鏡頭模組)預計 -2-4%
4. GIS-KY 6456(觸控)預計 -4-6%

建議:若持有這些,考慮減碼或停損
```

---

## 🔄 資料更新策略

### 主動更新

```python
# 每週掃描一次全部上市公司
async def weekly_supply_chain_scan():
    """
    每週日深夜跑:
    1. 抓新的法說會簡報
    2. 抓新聞中的供應鏈變動
    3. AI 更新資料庫
    """
    pass
```

### 被動更新

```python
# 有新聞觸發時即時更新
async def on_news_trigger(news: dict):
    """
    新聞 AI 判斷:有沒有提到供應鏈變動?
    有 → 立刻更新資料庫 + 通知 Vincent
    """
    supply_info = await extract_supply_chain(news)
    if supply_info:
        await upsert_relationships(supply_info)
        
        if supply_info['importance'] >= 7:
            await notify_vincent(
                f"🔗 供應鏈變動警報:{news['title']}"
            )
```

---

## 💰 額外成本

| 項目 | 費用 |
|------|------|
| 前端繪圖(React Flow) | 免費 |
| 法說會 PDF 抓取 | 免費(公開資訊觀測站) |
| AI 抽取關係 | 已含在 Claude API 費用 |
| 額外 Claude 用量 | +$5-10/月 |

---

## ⚠️ 限制說明

### 1. **資料完整度**
- 台灣上市公司約 1,800 檔
- 系統能整理出的關係約 5,000-10,000 條
- **不保證 100% 完整**

### 2. **關係動態**
- 供應鏈會變(例如換廠商)
- 資料有延遲(年報 1 年更新一次)
- 新聞會補,但不一定抓得到全部

### 3. **AI 準確度**
- AI 從新聞抽關係的準確度約 80-85%
- 每個關係標註「confidence」供 Vincent 判斷
- Vincent 可回報錯誤讓系統學習

---

## 🎯 Vincent 會得到什麼?

1. ✅ 看到每檔股票的「上下游」
2. ✅ 「連鎖效應」自動預測
3. ✅ 風險傳染預警
4. ✅ 「這檔為什麼漲」背後的供應鏈原因
5. ✅ 從「單檔視角」變「整條產業鏈視角」
