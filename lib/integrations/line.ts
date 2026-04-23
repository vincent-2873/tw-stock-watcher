// LINE Messaging API 封裝
// Docs: https://developers.line.biz/en/reference/messaging-api/

const LINE_API = "https://api.line.me/v2/bot";

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: unknown };

export async function pushMessage(userId: string, messages: LineMessage[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN not set");
  const r = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!r.ok) throw new Error(`LINE push failed ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function broadcastMessage(messages: LineMessage[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN not set");
  const r = await fetch(`${LINE_API}/message/broadcast`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) throw new Error(`LINE broadcast failed ${r.status}: ${await r.text()}`);
  return r.json();
}

// 建立盤前 / 盤後 flex message
export function buildMarketBriefingMessage(data: {
  date: string;
  twIndex: { price: number; change: number; changePct: number };
  usIndex: Array<{ label: string; price: number; changePct: number }>;
  topForeignBuy: Array<{ code: string; name: string; net: number }>;
}): LineMessage {
  const up = data.twIndex.change >= 0;
  const color = up ? "#E5364C" : "#10B981";
  const sign = up ? "▲" : "▼";

  return {
    type: "flex",
    altText: `${data.date} 盤前簡報 - 加權${data.twIndex.price}`,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `📊 ${data.date} 盤前簡報`,
            weight: "bold",
            size: "lg",
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: [
              { type: "text", text: "加權指數", size: "xs", color: "#888888" },
              {
                type: "text",
                text: `${data.twIndex.price.toFixed(0)}  ${sign}${Math.abs(data.twIndex.changePct).toFixed(2)}%`,
                weight: "bold",
                size: "xl",
                color,
              },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🌍 美股收盤",
            size: "sm",
            weight: "bold",
            margin: "md",
          },
          ...data.usIndex.slice(0, 4).map((i) => ({
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: i.label, size: "sm", flex: 2 },
              {
                type: "text",
                text: `${i.price.toFixed(0)}  ${i.changePct >= 0 ? "▲" : "▼"}${Math.abs(i.changePct).toFixed(2)}%`,
                size: "sm",
                color: i.changePct >= 0 ? "#E5364C" : "#10B981",
                flex: 3,
                align: "end",
              },
            ],
          })),
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🔥 外資買超 Top 5",
            size: "sm",
            weight: "bold",
            margin: "md",
          },
          ...data.topForeignBuy.slice(0, 5).map((s) => ({
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: `${s.code} ${s.name}`, size: "sm", flex: 3 },
              {
                type: "text",
                text: `+${s.net.toLocaleString()}`,
                size: "sm",
                color: "#E5364C",
                flex: 2,
                align: "end",
              },
            ],
          })),
        ],
      },
    },
  };
}
