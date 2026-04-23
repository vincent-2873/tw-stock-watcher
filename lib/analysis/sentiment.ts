// 新聞情緒分析（Claude/OpenAI 二擇一）

type SentimentResult = {
  score: number;        // -1 ~ +1
  label: "利多" | "利空" | "中性";
  stocks: string[];     // 提及的股票代號
  summary: string;
};

const SYSTEM = `你是台股新聞分析專家。對給定新聞做 3 件事：
1. 判斷對股市整體 / 特定標的是利多(+) / 利空(-) / 中性(0)，給 -1~+1 分數
2. 辨識文中提及的台股代號（如 2330、2317、0050）或公司名
3. 用 1 句話總結要點

只回覆 JSON，格式：
{"score": 0.7, "label": "利多", "stocks": ["2330", "2454"], "summary": "..."}`;

export async function analyzeNewsSentiment(text: string): Promise<SentimentResult> {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (anthropic) return callClaude(text, anthropic);
  if (openai) return callOpenAI(text, openai);

  // fallback：詞典法
  return fallbackDictionary(text);
}

async function callClaude(text: string, apiKey: string): Promise<SentimentResult> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: text.slice(0, 2000) }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const j = await r.json();
  const content = j.content?.[0]?.text ?? "{}";
  return parseOrFallback(content, text);
}

async function callOpenAI(text: string, apiKey: string): Promise<SentimentResult> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text.slice(0, 2000) }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  const j = await r.json();
  return parseOrFallback(j.choices?.[0]?.message?.content ?? "{}", text);
}

function parseOrFallback(content: string, original: string): SentimentResult {
  try {
    const obj = JSON.parse(content.replace(/```json|```/g, "").trim());
    return {
      score: Number(obj.score ?? 0),
      label: obj.label ?? "中性",
      stocks: Array.isArray(obj.stocks) ? obj.stocks : [],
      summary: String(obj.summary ?? original.slice(0, 80)),
    };
  } catch {
    return fallbackDictionary(original);
  }
}

function fallbackDictionary(text: string): SentimentResult {
  const pos = ["大漲", "創高", "看好", "優於預期", "訂單", "營收創新高", "買超", "利多"];
  const neg = ["大跌", "創低", "看壞", "低於預期", "虧損", "賣超", "利空", "警訊", "下修"];
  let score = 0;
  pos.forEach((w) => { if (text.includes(w)) score += 0.2; });
  neg.forEach((w) => { if (text.includes(w)) score -= 0.2; });
  score = Math.max(-1, Math.min(1, score));
  const stocks = Array.from(new Set(text.match(/\b\d{4}\b/g) ?? []));
  return {
    score,
    label: score > 0.2 ? "利多" : score < -0.2 ? "利空" : "中性",
    stocks,
    summary: text.slice(0, 100),
  };
}
