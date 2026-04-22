# 📱 手機體驗與離線處理規格書

> 解決 LINE 推播不夠用 + 離線狀況的盲點

---

# Part 1:多通道推播

## 🎯 為什麼不能只靠 LINE?

```
LINE 的限制:
 ❌ 字數限制(500 字)
 ❌ 不能放互動式按鈕
 ❌ 手機沒開 LINE 會延遲
 ❌ LINE 伺服器偶爾當機

需要補:
 ✅ PWA(網頁版 APP)推播
 ✅ 緊急情況 SMS
 ✅ Email 備援
```

---

## 🔧 PWA(Progressive Web App)實作

### 什麼是 PWA?

```
你的網站 + 服務工作者 = 類 APP 體驗

功能:
 ✅ 加到手機主畫面(像 APP)
 ✅ 離線仍能開啟
 ✅ 接收背景推播
 ✅ 無需上架 App Store(省錢)
```

### 基本設定

```javascript
// frontend/public/manifest.json
{
    "name": "Vincent Stock System",
    "short_name": "VSIS",
    "description": "Vincent 的個人金融情報系統",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#3b82f6",
    "icons": [
        {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

### Service Worker(背景推播)

```javascript
// frontend/public/sw.js
self.addEventListener('push', event => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.click_action_url,
        actions: data.actions || [],
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    clients.openWindow(event.notification.data);
});
```

---

## 🔔 通知優先級對應表

| 事件類型 | LINE | PWA Push | SMS | Email |
|---------|------|---------|-----|-------|
| 早報(08:00) | ✅ | ✅ | ❌ | 可選 |
| 當沖推薦 | ✅ | ✅ | ❌ | ❌ |
| 一般警報 | ✅ | ✅ | ❌ | ❌ |
| CRITICAL 警報 | ✅ | ✅ | ✅ | ✅ |
| 系統故障 | ✅ | ✅ | ✅ | ✅ |
| 帳號可疑登入 | ✅ | ❌ | ✅ | ✅ |

---

## 💰 SMS 成本控制

```python
# SMS 只在「真的緊急」才用
SMS_RULES = {
    "max_per_month": 10,       # 每月上限
    "max_per_day": 3,          # 每日上限
    "min_interval_minutes": 15, # 間隔
    
    "trigger_conditions": [
        "account_compromised",
        "single_stock_halted_trading",  # 全額交割
        "system_critical_error",
        "stop_loss_triggered_critical",
    ],
}

# 推薦使用:Twilio(國際)或三竹資訊(台灣)
# 成本:~NT$ 0.8-1.5 / 則
# 每月預估:NT$ 15-45
```

---

# Part 2:離線處理

## 🎯 情境:Vincent 沒網路時

```
情境 1:通勤(捷運隧道)
情境 2:飛機上
情境 3:國外漫遊省網路
情境 4:Wi-Fi 掛了

系統怎麼辦?
```

---

## 📦 離線快取策略

### 層級 1:**關鍵資料永遠預載**

```javascript
// Service Worker 快取策略

// 進入系統時,預載以下資料
const CRITICAL_CACHE = [
    '/',                           // 首頁
    '/dashboard',                  // Dashboard
    '/watchlist',                  // 自選股
    '/api/stocks/watchlist',       // 自選股資料
    '/api/user/settings',          // 使用者設定
    '/api/reports/today',          // 今日報告
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('vsis-v1').then(cache => {
            return cache.addAll(CRITICAL_CACHE);
        })
    );
});
```

### 層級 2:**離線時可看,但明確標示**

```javascript
// 離線模式 UI
if (!navigator.onLine) {
    showOfflineBanner({
        message: "⚠️ 目前離線中,顯示的是快取資料",
        lastUpdated: "2026-04-22 08:30 TPE",
        action: "連線後會自動更新"
    });
}
```

### 層級 3:**離線能做什麼 / 不能做什麼**

```
✅ 離線可以做:
 - 看自選股快取的資料
 - 看今日報告
 - 看歷史分析
 - 看持股紀錄
 - 使用計算工具(部位/風險)
 - 讀對話歷史

❌ 離線不能做:
 - 下新單(需即時價格)
 - 查詢新股票
 - AI 對話(需 Claude API)
 - 看即時價格
 - 更新警報
```

---

## 📱 離線 UI 設計

```
┌─────────────────────────────────────┐
│ ⚠️ 離線模式                          │
│ 資料更新於:2026-04-22 13:30 TPE     │
│ 連線後會自動重新整理                   │
├─────────────────────────────────────┤
│                                     │
│ 💼 你的自選股(快取)                 │
│                                     │
│ 鴻海 2317    213.00  🟢 +2.4%      │
│ 華邦電 2344  24.85   🔴 -3.2%      │
│ ...                                 │
│                                     │
│ ⚠️ 以上是 13:30 的資料                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 🔄 [重試連線]                        │
│                                     │
│ 💡 離線可做的事:                      │
│ • 複習今日報告                        │
│ • 查看持股紀錄                        │
│ • 使用計算工具                        │
│                                     │
└─────────────────────────────────────┘
```

---

## 🌐 網路品質自動偵測

```javascript
// 根據網路品質調整行為
navigator.connection?.addEventListener('change', () => {
    const connection = navigator.connection;
    
    if (connection.effectiveType === '2g' || connection.saveData) {
        // 慢網 / 省流量模式
        disableAutoRefresh();
        reduceImageQuality();
        showLowBandwidthMode();
    }
    else if (connection.effectiveType === '4g') {
        // 好網
        enableAllFeatures();
    }
});
```

---

# 🎯 Vincent 會得到什麼?

1. ✅ PWA 加到手機主畫面,像 APP 一樣用
2. ✅ 背景推播(LINE 之外的備援)
3. ✅ SMS 緊急通知(真的大事才收到)
4. ✅ 離線仍能看大部分資訊
5. ✅ 慢網自動省流量
