// AI 新聞情緒分析 — 利多 / 利空 / 中立 + 題材分類
// 優先 Claude，無 key 時 fallback 到詞典

export type NewsAnalysis = {
  score: number;           // -1 ~ +1
  label: "利多" | "利空" | "中立";
  summary: string;         // 40 字內重點摘要
  stocks: string[];        // 受影響個股代號
  themes: string[];        // 題材（AI / 伺服器 / CPO / 重電 / EV ...）
  sectors: string[];       // 產業（半導體 / 金融 / 航運 / 生技 ...）
  confidence: number;      // 0-1
};

const SYSTEM_PROMPT = `你是資深台股分析師。看完新聞後做結構化分析：

回應格式（必須是嚴格 JSON）：
{
  "score": -1 到 +1 的數字（正=利多、負=利空）,
  "label": "利多" 或 "利空" 或 "中立",
  "summary": "一句話摘要重點（40 字內）",
  "stocks": ["2330", "2317" ...] 明確提及的台股代號陣列,
  "themes": ["AI 伺服器", "CPO", "機器人" ...] 題材陣列,
  "sectors": ["半導體", "AI", "航運" ...] 產業陣列,
  "confidence": 0 到 1 的數字，你對判斷的信心
}

判斷原則：
- 訂單增加/營收創高/法人買超/除權息利多 → 利多
- 庫存去化中/競爭加劇/法說下修 → 利空
- 單純新品發表/高層異動 → 中立
- 產業/題材新聞雖然沒提個股，也要判斷對相關類股的影響`;

export async function analyzeNewsWithAI(title: string, content?: string): Promise<NewsAnalysis> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) return callClaude(title, content ?? "", key);
  const openai = process.env.OPENAI_API_KEY;
  if (openai) return callOpenAI(title, content ?? "", openai);
  return fallbackDictionary(title, content ?? "");
}

async function callClaude(title: string, content: string, apiKey: string): Promise<NewsAnalysis> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `標題：${title}\n內文：${content.slice(0, 1500)}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const j = await r.json();
  return parseResult(j.content?.[0]?.text ?? "{}", title);
}

async function callOpenAI(title: string, content: string, apiKey: string): Promise<NewsAnalysis> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `標題：${title}\n內文：${content.slice(0, 1500)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  const j = await r.json();
  return parseResult(j.choices?.[0]?.message?.content ?? "{}", title);
}

function parseResult(text: string, fallbackTitle: string): NewsAnalysis {
  try {
    const s = text.replace(/```json|```/g, "").trim();
    const obj = JSON.parse(s);
    return {
      score: Number(obj.score ?? 0),
      label: obj.label ?? "中立",
      summary: String(obj.summary ?? fallbackTitle).slice(0, 80),
      stocks: Array.isArray(obj.stocks) ? obj.stocks.map(String) : [],
      themes: Array.isArray(obj.themes) ? obj.themes.map(String) : [],
      sectors: Array.isArray(obj.sectors) ? obj.sectors.map(String) : [],
      confidence: Number(obj.confidence ?? 0.5),
    };
  } catch {
    return fallbackDictionary(fallbackTitle, "");
  }
}

function fallbackDictionary(title: string, content: string): NewsAnalysis {
  const text = `${title} ${content}`;
  const pos = ["大漲", "創高", "看好", "優於預期", "訂單", "營收創新高", "買超", "利多", "強勢", "飆漲", "突破", "登高", "受惠"];
  const neg = ["大跌", "創低", "看壞", "低於預期", "虧損", "賣超", "利空", "警訊", "下修", "崩", "跳水", "重挫", "保守"];
  const themes: Record<string, string[]> = {
    "AI 伺服器": ["AI 伺服器", "GB200", "GB300", "H100", "B100", "輝達伺服器"],
    "CPO": ["CPO", "光通訊", "光模組"],
    "矽光子": ["矽光子", "silicon photonics"],
    "機器人": ["人形機器人", "Optimus", "具身智慧"],
    "EV": ["電動車", "EV", "特斯拉", "比亞迪"],
    "重電": ["重電", "台電", "電網", "變壓器"],
    "蘋概": ["蘋果", "iPhone", "Apple"],
    "散熱": ["散熱", "水冷", "液冷"],
    "記憶體": ["HBM", "DRAM", "記憶體"],
  };
  const sectors: Record<string, string[]> = {
    "半導體": ["台積電", "聯電", "聯發科", "半導體", "晶圓", "IC"],
    "航運": ["長榮", "陽明", "萬海", "航運", "運費"],
    "金融": ["金控", "銀行", "壽險"],
    "生技": ["生技", "製藥", "疫苗"],
  };
  let score = 0;
  pos.forEach((w) => { if (text.includes(w)) score += 0.2; });
  neg.forEach((w) => { if (text.includes(w)) score -= 0.2; });
  score = Math.max(-1, Math.min(1, score));
  const foundThemes = Object.entries(themes).filter(([, kws]) => kws.some((w) => text.includes(w))).map(([k]) => k);
  const foundSectors = Object.entries(sectors).filter(([, kws]) => kws.some((w) => text.includes(w))).map(([k]) => k);
  const stocks = Array.from(new Set(text.match(/\b\d{4}\b/g) ?? []));
  return {
    score,
    label: score > 0.2 ? "利多" : score < -0.2 ? "利空" : "中立",
    summary: title.slice(0, 80),
    stocks,
    themes: foundThemes,
    sectors: foundSectors,
    confidence: 0.3,
  };
}
