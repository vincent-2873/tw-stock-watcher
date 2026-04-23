# 📱 Line 通知規則 · Flex Message

## 🎯 核心原則

### 1. 必須用 Flex Message
- ❌ 不可以用純文字訊息
- ✅ 所有通知都要用 Flex Message 格式（JSON 結構）

### 2. 總量控制
- 每日上限 **10 則**（一般通知）
- 🔴 致命急訊不受此限制

### 3. AI 重要度判斷
- 重要度 < 6 → **不推**
- 重要度 6-7 → 推（一般排序）
- 重要度 8-9 → **優先推**
- 重要度 10 → **立即推 + 震動**

### 4. 免打擾時段
- 22:00 ~ 07:00 不推（除非是國際級重大事件 + 重要度 10）

---

## 📋 五種通知類型

### 🔴 類型 1：致命急訊（Critical）

**觸發條件**：
- 自選股閃崩（> -7%）
- 自選股漲停
- 外資單日賣超 > 300 億
- 重點人物重大發言（重要度 ≥ 9）
- 突發國際事件（戰爭、金融危機）

**推送時機**：**立即**（不受時段限制）

**Flex Message 範本**：

```json
{
  "type": "flex",
  "altText": "🔴 致命急訊：[股票名] 閃崩",
  "contents": {
    "type": "bubble",
    "size": "kilo",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#B85450",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": "🔴 致命急訊",
              "color": "#F5EFE0",
              "weight": "bold",
              "size": "lg"
            },
            {
              "type": "text",
              "text": "{time}",
              "color": "#F5EFE0",
              "size": "sm",
              "align": "end"
            }
          ]
        },
        {
          "type": "text",
          "text": "{event_type}",
          "color": "#F5EFE0",
          "size": "xs",
          "margin": "xs"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "{stock_name} {stock_code}",
              "weight": "bold",
              "size": "xl"
            },
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "{price}",
                  "size": "xxl",
                  "weight": "bold",
                  "color": "#C95B4C"
                },
                {
                  "type": "text",
                  "text": "{change}",
                  "color": "#C95B4C",
                  "gravity": "center",
                  "align": "end"
                }
              ]
            }
          ]
        },
        {
          "type": "separator"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🦆 呱呱解讀",
              "weight": "bold",
              "size": "sm",
              "color": "#B8893D"
            },
            {
              "type": "text",
              "text": "{quack_analysis}",
              "size": "sm",
              "wrap": true,
              "margin": "sm"
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "🔍 看詳情",
            "uri": "https://tw-stock-watcher.zeabur.app/stocks/{code}"
          },
          "style": "primary",
          "color": "#B85450",
          "flex": 2
        },
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "💬 問呱呱",
            "uri": "https://tw-stock-watcher.zeabur.app/chat?context={code}"
          },
          "style": "secondary",
          "flex": 1
        }
      ]
    }
  }
}
```

---

### 🟡 類型 2：盤前盤中盤後通知

**觸發條件**：
- **盤前 8:30**：當日晨報
- **盤中特殊時刻**：大盤跌破月線 / VIX > 25 / 某題材突然升溫
- **盤後 13:45**：當日總結

**Flex Message 範本（盤前晨報）**：

```json
{
  "type": "flex",
  "altText": "🦆 呱呱今日晨報",
  "contents": {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#B8893D",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "text",
          "text": "🦆 呱呱今日晨報",
          "color": "#F5EFE0",
          "weight": "bold",
          "size": "xl"
        },
        {
          "type": "text",
          "text": "{date}",
          "color": "#F5EFE0",
          "size": "sm",
          "margin": "xs"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": "「{headline}」",
          "weight": "bold",
          "size": "md",
          "wrap": true,
          "color": "#2C2416"
        },
        {
          "type": "text",
          "text": "{summary}",
          "size": "sm",
          "wrap": true,
          "color": "#4A3F28"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "📊 今日三碗茶",
          "weight": "bold",
          "size": "sm",
          "color": "#B8893D",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                { "type": "text", "text": "🥇", "flex": 0 },
                { "type": "text", "text": "{pick1_name}", "weight": "bold", "flex": 2 },
                { "type": "text", "text": "{pick1_tier}", "color": "{pick1_color}", "flex": 1 },
                { "type": "text", "text": "{pick1_note}", "size": "xs", "color": "#7A6E53", "flex": 2 }
              ]
            },
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                { "type": "text", "text": "🥈", "flex": 0 },
                { "type": "text", "text": "{pick2_name}", "weight": "bold", "flex": 2 },
                { "type": "text", "text": "{pick2_tier}", "color": "{pick2_color}", "flex": 1 },
                { "type": "text", "text": "{pick2_note}", "size": "xs", "color": "#7A6E53", "flex": 2 }
              ]
            },
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                { "type": "text", "text": "🥉", "flex": 0 },
                { "type": "text", "text": "{pick3_name}", "weight": "bold", "flex": 2 },
                { "type": "text", "text": "{pick3_tier}", "color": "{pick3_color}", "flex": 1 },
                { "type": "text", "text": "{pick3_note}", "size": "xs", "color": "#7A6E53", "flex": 2 }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "📄 看完整晨報",
            "uri": "https://tw-stock-watcher.zeabur.app/"
          },
          "style": "primary",
          "color": "#2C2416"
        }
      ]
    }
  }
}
```

---

### 🟢 類型 3：到價通知

**觸發條件**：
- 使用者自設的到價提醒觸發
- 呱呱推薦的進場價到達
- 停損價 / 停利價到達

**Flex Message 範本**：

```json
{
  "type": "flex",
  "altText": "🟢 到價通知：{stock_name} 到達{price_type}",
  "contents": {
    "type": "bubble",
    "size": "kilo",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#7A8B5C",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "text",
          "text": "🟢 到價通知",
          "color": "#F5EFE0",
          "weight": "bold",
          "size": "lg"
        },
        {
          "type": "text",
          "text": "{price_type_label}",
          "color": "#F5EFE0",
          "size": "sm"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "{stock_name} {stock_code}",
          "weight": "bold",
          "size": "xl"
        },
        {
          "type": "text",
          "text": "{tier} 級",
          "size": "sm",
          "color": "{tier_color}",
          "margin": "xs"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                { "type": "text", "text": "目前價", "size": "sm", "color": "#7A6E53", "flex": 2 },
                { "type": "text", "text": "{current_price}", "size": "sm", "weight": "bold", "flex": 3, "align": "end" }
              ]
            },
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                { "type": "text", "text": "觸發價", "size": "sm", "color": "#7A6E53", "flex": 2 },
                { "type": "text", "text": "{triggered_price}", "size": "sm", "weight": "bold", "color": "#B85450", "flex": 3, "align": "end" }
              ]
            }
          ]
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "🎯 操作建議",
          "weight": "bold",
          "size": "sm",
          "color": "#B8893D",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "spacing": "xs",
          "contents": [
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "進場", "size": "xs", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{entry_range}", "size": "xs", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "停損", "size": "xs", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{stop_loss}", "size": "xs", "color": "#6B8B5A", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "停利", "size": "xs", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{take_profit}", "size": "xs", "color": "#C95B4C", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "R:R", "size": "xs", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{risk_reward}", "size": "xs", "weight": "bold", "flex": 2, "align": "end" }
            ]}
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "✅ 我買了",
            "data": "bought_{code}"
          },
          "style": "primary",
          "color": "#7A8B5C",
          "flex": 1
        },
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "⏸️ 先觀望",
            "data": "watching_{code}"
          },
          "style": "secondary",
          "flex": 1
        }
      ]
    }
  }
}
```

---

### 🔵 類型 4：情報緊急

**觸發條件**：
- AI 判重要度 ≥ 8 的新聞
- 影響自選股的重要新聞
- 重點人物發言

**Flex Message 範本**：

```json
{
  "type": "flex",
  "altText": "🔵 重要情報：{headline}",
  "contents": {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#4A6B7C",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": "🔵 重要情報",
              "color": "#F5EFE0",
              "weight": "bold",
              "size": "lg"
            },
            {
              "type": "text",
              "text": "重要度 {importance}/10",
              "color": "#F5EFE0",
              "size": "sm",
              "align": "end"
            }
          ]
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": "{source_emoji}",
              "flex": 0
            },
            {
              "type": "text",
              "text": "{source} · {person_or_author}",
              "size": "xs",
              "color": "#7A6E53",
              "margin": "sm"
            }
          ]
        },
        {
          "type": "text",
          "text": "{headline}",
          "weight": "bold",
          "size": "md",
          "wrap": true
        },
        {
          "type": "separator"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "🦆 呱呱分析",
                  "weight": "bold",
                  "size": "sm",
                  "color": "#B8893D",
                  "flex": 2
                },
                {
                  "type": "text",
                  "text": "{sentiment_emoji} {sentiment} · {confidence}%",
                  "size": "sm",
                  "color": "{sentiment_color}",
                  "align": "end",
                  "flex": 3
                }
              ]
            },
            {
              "type": "text",
              "text": "{summary}",
              "size": "sm",
              "wrap": true,
              "margin": "sm"
            }
          ]
        },
        {
          "type": "separator"
        },
        {
          "type": "text",
          "text": "📊 影響個股",
          "weight": "bold",
          "size": "sm",
          "color": "#B8893D"
        },
        {
          "type": "box",
          "layout": "vertical",
          "spacing": "xs",
          "contents": [
            {
              "type": "text",
              "text": "{affected_stocks_list}",
              "size": "xs",
              "wrap": true
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "📖 看完整分析",
            "uri": "https://tw-stock-watcher.zeabur.app/intel/{article_id}"
          },
          "style": "primary",
          "color": "#4A6B7C"
        }
      ]
    }
  }
}
```

---

### 🟣 類型 5：呱呱新推薦

**觸發條件**：
- 每天早上新的三碗茶
- 盤中某股評級從 R 升到 SR/SSR
- 觸發多項正面訊號的新標的

**Flex Message 範本**：

```json
{
  "type": "flex",
  "altText": "🟣 呱呱新推薦：{stock_name} {tier} 級",
  "contents": {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "background": {
        "type": "linearGradient",
        "angle": "135deg",
        "startColor": "#B8893D",
        "endColor": "#B85450"
      },
      "backgroundColor": "#B8893D",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "text",
          "text": "🟣 呱呱新推薦",
          "color": "#F5EFE0",
          "weight": "bold",
          "size": "lg"
        },
        {
          "type": "text",
          "text": "{date} 出爐",
          "color": "#F5EFE0",
          "size": "xs"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": "🎖️",
              "flex": 0,
              "size": "xxl"
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "md",
              "contents": [
                {
                  "type": "text",
                  "text": "{stock_name}",
                  "weight": "bold",
                  "size": "xl"
                },
                {
                  "type": "text",
                  "text": "{stock_code}",
                  "size": "sm",
                  "color": "#7A6E53"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "{tier}",
                  "size": "xxl",
                  "weight": "bold",
                  "color": "{tier_color}",
                  "align": "end"
                },
                {
                  "type": "text",
                  "text": "{score}/95",
                  "size": "xs",
                  "color": "#7A6E53",
                  "align": "end"
                }
              ]
            }
          ]
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "💡 為什麼",
          "weight": "bold",
          "size": "sm",
          "color": "#B8893D",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "{reason}",
          "size": "sm",
          "wrap": true,
          "margin": "sm"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "🎯 操作計畫",
          "weight": "bold",
          "size": "sm",
          "color": "#B8893D",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "margin": "sm",
          "contents": [
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "進場", "size": "sm", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{entry_range}", "size": "sm", "weight": "bold", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "停損", "size": "sm", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{stop_loss}", "size": "sm", "color": "#6B8B5A", "weight": "bold", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "停利", "size": "sm", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{take_profit}", "size": "sm", "color": "#C95B4C", "weight": "bold", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "R:R", "size": "sm", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{risk_reward}", "size": "sm", "weight": "bold", "flex": 2, "align": "end" }
            ]},
            { "type": "box", "layout": "horizontal", "contents": [
              { "type": "text", "text": "週期", "size": "sm", "color": "#7A6E53", "flex": 1 },
              { "type": "text", "text": "{time_horizon}", "size": "sm", "flex": 2, "align": "end" }
            ]}
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "📊 看完整分析",
            "uri": "https://tw-stock-watcher.zeabur.app/stocks/{code}"
          },
          "style": "primary",
          "color": "#B85450",
          "flex": 2
        },
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "➕ 加自選",
            "data": "add_watchlist_{code}"
          },
          "style": "secondary",
          "flex": 1
        }
      ]
    }
  }
}
```

---

## 🔧 實作範例（Node.js）

```typescript
import { Client } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

export async function sendCriticalAlert(
  userId: string,
  alert: CriticalAlert
) {
  // 檢查是否在免打擾時段（致命急訊不受限）
  if (!alert.bypassQuietHours && isQuietHour()) {
    return;
  }

  // 檢查每日上限
  if (alert.type !== 'critical') {
    const todayCount = await getTodayNotificationCount(userId);
    if (todayCount >= 10) {
      console.log('Reached daily limit, skipping');
      return;
    }
  }

  const flex = buildFlexMessage(alert);

  await client.pushMessage(userId, flex);

  await logNotification(userId, alert);
}

function isQuietHour(): boolean {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    hour12: false
  });
  const hour = parseInt(now);
  return hour >= 22 || hour < 7;
}

function buildFlexMessage(alert: Alert) {
  switch (alert.type) {
    case 'critical': return buildCriticalFlex(alert);
    case 'morning_brief': return buildMorningBriefFlex(alert);
    case 'price_alert': return buildPriceAlertFlex(alert);
    case 'intel': return buildIntelFlex(alert);
    case 'new_pick': return buildNewPickFlex(alert);
  }
}
```

---

## 📊 通知排程表

```
06:00  準備當日資料
08:00  爬取昨夜美股 + 今晨新聞
08:30  📱 發送盤前晨報（🟡）
09:00  台股開盤監測啟動
09:00-13:30  盤中即時監測（致命 🔴 即時推）
11:30  📱 盤中狀態（🟡，只在有異常時）
13:30  台股收盤
13:45  📱 發送盤後總結（🟡）
14:30  盤後報告生成
15:00  呱呱命中率計算
21:00  美股盤前資料更新
22:00  進入免打擾模式（國際重大事件除外）
```

---

## ✅ 測試清單

每次部署新通知前測試：
- [ ] Flex Message 在 iOS 顯示正常？
- [ ] Flex Message 在 Android 顯示正常？
- [ ] 按鈕點擊跳對網址？
- [ ] Postback 事件處理正確？
- [ ] 圖片/emoji 顯示正常？
- [ ] 多筆數據時排版不壞？

---

**版本**：v1.0
**最後更新**：2026-04-23
