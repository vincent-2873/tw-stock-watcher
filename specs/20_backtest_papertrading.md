# 📊 回測 / 模擬交易規格書

> Vincent 第一次用系統就投真錢?太危險。
> 這份規格讓你先「空單測試 1-3 個月」,確認準了再用真錢。

---

# 🎯 兩種模式

## 模式 A:**歷史回測**(Backtest)
用**過去的資料**測試策略:
- 如果過去 2 年都用這套系統,會賺多少?
- 哪些策略勝率最高?
- 最大回撤是多少?

## 模式 B:**模擬交易**(Paper Trading)
用**即時資料**但**不下真單**:
- 系統推薦 → 假裝買 → 追蹤 1 個月
- 每日更新損益
- 跟真實交易同步

---

# 📚 歷史回測設計

## 核心問題:怎麼「重演」過去?

```
2024-01-01 系統推薦買鴻海 200 元
2024-12-31 系統累計做了 100 筆交易

回測要問:
 Q1: 若 Vincent 全照系統做,總報酬多少?
 Q2: 最大回撤何時?多深?
 Q3: 勝率多少?
 Q4: 哪些策略有效?
 Q5: 跟大盤比如何?
```

## 技術實作

```python
# core/backtest_engine.py

class BacktestEngine:
    """
    歷史回測引擎
    """
    
    def __init__(
        self,
        start_date: date,
        end_date: date,
        initial_capital: float = 1_000_000,
        strategies: list[str] = None,
    ):
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.strategies = strategies or ["all"]
        
        self.portfolio = Portfolio(initial_capital)
        self.trades = []
        self.daily_equity = []
    
    async def run(self) -> BacktestResult:
        """
        逐日重演
        """
        current_date = self.start_date
        
        while current_date <= self.end_date:
            # 跳過非交易日
            if not is_trading_day(current_date):
                current_date += timedelta(days=1)
                continue
            
            # 1. 用當時的資料快照
            snapshot = await load_historical_snapshot(current_date)
            
            # 2. 執行系統邏輯(同真實運作)
            recommendations = await decision_engine.run_on_historical(
                data=snapshot,
                date=current_date,
                strategies=self.strategies,
            )
            
            # 3. 模擬執行
            for rec in recommendations:
                await self._execute_recommendation(rec, current_date)
            
            # 4. 更新持有部位(模擬盤中)
            await self._update_positions(current_date)
            
            # 5. 檢查停損停利
            await self._check_stops(current_date)
            
            # 6. 紀錄當日權益
            self.daily_equity.append({
                "date": current_date,
                "cash": self.portfolio.cash,
                "positions_value": self.portfolio.positions_value,
                "total": self.portfolio.total_value,
            })
            
            current_date += timedelta(days=1)
        
        return self._compile_results()
    
    def _compile_results(self) -> BacktestResult:
        """
        統計結果
        """
        total_return = (
            self.portfolio.total_value / self.initial_capital - 1
        ) * 100
        
        # 計算年化報酬、夏普、最大回撤等
        metrics = calculate_performance_metrics(
            self.daily_equity,
            self.trades
        )
        
        return BacktestResult(
            total_return_pct=total_return,
            annualized_return=metrics.annualized,
            sharpe_ratio=metrics.sharpe,
            max_drawdown=metrics.max_drawdown,
            win_rate=metrics.win_rate,
            avg_win=metrics.avg_win,
            avg_loss=metrics.avg_loss,
            profit_factor=metrics.profit_factor,
            total_trades=len(self.trades),
            daily_equity=self.daily_equity,
            trades=self.trades,
        )
```

## 回測重要指標

```python
@dataclass
class BacktestResult:
    """回測結果"""
    
    # 報酬
    total_return_pct: float          # 總報酬率
    annualized_return: float         # 年化報酬
    
    # 風險
    max_drawdown: float              # 最大回撤
    max_drawdown_date: date          # 何時發生
    max_drawdown_duration_days: int  # 持續多久
    volatility: float                # 波動度
    
    # 風險調整報酬
    sharpe_ratio: float              # 夏普值
    sortino_ratio: float             # 索蒂諾(只算下檔)
    calmar_ratio: float              # 卡瑪值
    
    # 交易統計
    total_trades: int
    win_rate: float                  # 勝率
    avg_win: float                   # 平均獲利
    avg_loss: float                  # 平均虧損
    profit_factor: float             # 獲利因子(總賺 / 總賠)
    
    # 持有
    avg_holding_days: float
    longest_win_streak: int
    longest_loss_streak: int
    
    # 對比基準
    vs_taiex_pct: float              # 跟大盤比差多少
    beta_to_taiex: float             # 跟大盤關聯
```

## UI 呈現

```
┌─────────────────────────────────────┐
│ 📊 歷史回測                          │
├─────────────────────────────────────┤
│                                     │
│ 回測設定                             │
│ 期間:2024/01/01 - 2024/12/31       │
│ 初始資金:100 萬                     │
│ 策略:全部                            │
│ [重新設定]                            │
│                                     │
├─────────────────────────────────────┤
│ 📈 總體績效                          │
│                                     │
│ 總報酬率:  +32.5% 🟢                │
│ 年化報酬:  +32.5%                   │
│ 大盤同期:  +18.2%                   │
│ 超額報酬:  +14.3% ⭐                │
│                                     │
│ 夏普值:    1.85(優)                │
│ 最大回撤:  -12.3%(於 2024/08)    │
│ 勝率:      62.5%                    │
│                                     │
│ [權益曲線圖]                          │
│                                     │
├─────────────────────────────────────┤
│ 📊 交易分析                          │
│                                     │
│ 總交易次數:  48                      │
│ 獲利交易:    30(62.5%)            │
│ 虧損交易:    18(37.5%)            │
│                                     │
│ 平均獲利:    +6.2%                  │
│ 平均虧損:    -3.1%                  │
│ 獲利因子:    2.05(賺 1 賠 0.5)    │
│                                     │
│ 最大單筆獲利:+18.5%(台達電)         │
│ 最大單筆虧損:-8.2%(某科技)         │
│                                     │
├─────────────────────────────────────┤
│ 🎯 策略績效分解                      │
│                                     │
│ 動能突破型:     +12 筆 勝率 58%     │
│ 主力進場型:     +8  筆 勝率 75% ⭐  │
│ 法人聯手型:     +15 筆 勝率 67%     │
│ 題材早期型:     +7  筆 勝率 71%     │
│ 營收爆發型:     +6  筆 勝率 50%     │
│                                     │
│ 💡 發現:                             │
│ 「主力進場型」最穩定,建議提高權重    │
│                                     │
├─────────────────────────────────────┤
│ 📉 最大回撤分析                      │
│                                     │
│ 發生於:  2024/08/05 - 2024/08/15   │
│ 深度:    -12.3%                     │
│ 原因:    全球科技股修正              │
│ 持有的:  鴻海、台達電、廣達           │
│ 持續:    11 天                       │
│                                     │
│ 💡 系統當時有做對嗎?                 │
│ ✅ 8/8 外資開始賣超 → 系統發警告      │
│ ✅ 8/10 觸發停損 → 執行了             │
│ ⚠️ 但停損有點晚,可優化觸發條件      │
│                                     │
└─────────────────────────────────────┘
```

---

# 📄 模擬交易(Paper Trading)

## 概念

```
即時運作的系統推薦 → 存為「模擬交易」
 → 每日更新損益(像真的交易)
 → 不下真單
 → 累積 1-3 個月後評估
```

## 技術實作

```python
# core/paper_trading.py

class PaperTradingAccount:
    """
    模擬交易帳戶
    """
    
    def __init__(self, initial_capital: float = 1_000_000):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions = {}
        self.trade_history = []
    
    async def place_order(
        self, 
        stock_id: str, 
        action: str,
        quantity: int,
        price: float,
        from_recommendation_id: str = None,
    ):
        """
        模擬下單(不接觸真實券商)
        """
        # 計算成本(含手續費)
        cost = price * quantity * 1000  # 張轉股
        fee = cost * 0.001425  # 手續費 0.1425%
        
        if action == "buy":
            if cost + fee > self.cash:
                raise InsufficientFunds()
            
            self.cash -= (cost + fee)
            self.positions.setdefault(stock_id, {"qty": 0, "cost": 0})
            self.positions[stock_id]["qty"] += quantity
            self.positions[stock_id]["cost"] += cost
        
        elif action == "sell":
            pos = self.positions.get(stock_id)
            if not pos or pos["qty"] < quantity:
                raise InsufficientPosition()
            
            tax = cost * 0.003  # 證交稅
            self.cash += (cost - fee - tax)
            pos["qty"] -= quantity
            if pos["qty"] == 0:
                del self.positions[stock_id]
        
        # 記錄
        trade = {
            "stock_id": stock_id,
            "action": action,
            "quantity": quantity,
            "price": price,
            "fee": fee,
            "executed_at": datetime.now(TPE),
            "from_recommendation_id": from_recommendation_id,
        }
        self.trade_history.append(trade)
        
        # 存資料庫
        await save_paper_trade(trade)
```

## 模擬 vs 真實的差異處理

```python
# 執行滑價模擬(真實世界會有)
def simulate_slippage(planned_price: float, volume: int) -> float:
    """
    模擬真實下單會有的滑價
    """
    # 小單:滑價小
    if volume < 10:
        slippage_pct = 0.05  # 0.05%
    # 中單
    elif volume < 50:
        slippage_pct = 0.15
    # 大單:滑價大
    else:
        slippage_pct = 0.30
    
    return planned_price * (1 + slippage_pct / 100)
```

## UI:模擬交易儀表板

```
┌─────────────────────────────────────┐
│ 📄 模擬交易(Paper Trading)         │
├─────────────────────────────────────┤
│                                     │
│ 帳戶狀況                             │
│ 初始資金:100 萬                     │
│ 目前資產:112.5 萬 🟢 +12.5%        │
│ 現金:    45 萬                      │
│ 持股市值:67.5 萬                    │
│                                     │
│ 運作天數:58 天                       │
│ 自 2026/02/23 開始                  │
│                                     │
├─────────────────────────────────────┤
│ 📈 持有部位(5 檔)                   │
│                                     │
│ 鴻海 2317   成本 210  現 218  +3.8% │
│ 台達電 2308  成本 405  現 412  +1.7% │
│ 廣達 2382   成本 280  現 312  +11.4%│
│ 聯發科 2454  成本 1150 現 1180 +2.6% │
│ 台積電 2330  成本 580  現 592  +2.1% │
│                                     │
├─────────────────────────────────────┤
│ 🎯 績效指標                          │
│                                     │
│ 勝率:        14/18(78%)🟢         │
│ 平均獲利:    +4.2%                  │
│ 平均虧損:    -2.8%                  │
│ 獲利因子:    2.10                   │
│                                     │
│ 系統準確度:  78%                    │
│ (建議信心度 75% 的實際勝率)          │
│                                     │
├─────────────────────────────────────┤
│ 💡 系統建議                          │
│                                     │
│ 模擬交易已運行 58 天                  │
│ 績效穩定在 +12.5%,超越大盤 +7.8%     │
│                                     │
│ 🎯 建議:                              │
│ ✅ 系統表現達到上線標準                │
│ ✅ 可以考慮用真金實銀開始              │
│ ✅ 建議先用小部位(例如 20%)          │
│ ✅ 累積 3 個月真實交易再加碼          │
│                                     │
│ [轉為真實交易] [繼續模擬]             │
│                                     │
└─────────────────────────────────────┘
```

---

# 🎯 上線檢驗標準

Vincent 在用「真錢」前,要過這 5 關:

```
關卡 1:歷史回測達標
 ✅ 年化報酬 > 大盤 5%
 ✅ 最大回撤 < -20%
 ✅ 夏普值 > 1.0
 ✅ 勝率 > 55%

關卡 2:模擬交易 1 個月
 ✅ 實測勝率接近回測值(±10%)
 ✅ 沒有未預期的系統錯誤
 ✅ Vincent 跟得上系統節奏

關卡 3:模擬交易 3 個月
 ✅ 績效穩定,不是單月運氣好
 ✅ 橫跨不同市場狀態(多/空/盤整)
 ✅ Vincent 心理測試通過(沒焦慮失眠)

關卡 4:小額真實交易(20% 資金)
 ✅ 1 個月試水溫
 ✅ 確認真實滑價、手續費沒問題
 ✅ 確認心理上能承受真錢波動

關卡 5:完整啟用
 ✅ 逐步加碼到完整部位
 ✅ 持續追蹤
```

**這 5 關保護 Vincent 不會一開始就虧大錢。**

---

# 💾 資料庫

```sql
CREATE TABLE paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    
    stock_id VARCHAR(10),
    action VARCHAR(10),
    quantity INT,
    price NUMERIC(10, 2),
    
    fee NUMERIC(10, 2),
    tax NUMERIC(10, 2),
    
    executed_at TIMESTAMPTZ,
    from_recommendation_id UUID REFERENCES recommendations(id),
    
    -- 結果
    closed_at TIMESTAMPTZ,
    close_price NUMERIC(10, 2),
    pnl NUMERIC(10, 2),
    pnl_pct NUMERIC(6, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    start_date DATE,
    end_date DATE,
    initial_capital NUMERIC(12, 2),
    strategies TEXT[],
    
    -- 結果 JSON(上面的 BacktestResult)
    results JSONB,
    
    run_at TIMESTAMPTZ DEFAULT NOW(),
    run_duration_seconds INT
);
```
