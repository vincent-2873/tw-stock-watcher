// 新聞抓取（鉅亨網 + 工商時報 RSS，無需 key）

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
};

const RSS_SOURCES = [
  { url: "https://news.cnyes.com/rss/cat/tw_stock", source: "鉅亨網台股" },
  { url: "https://news.cnyes.com/rss/cat/wd_stock", source: "鉅亨網美股" },
  { url: "https://news.cnyes.com/rss/cat/headline", source: "鉅亨網頭條" },
];

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubRegex = /<pubDate>(.*?)<\/pubDate>/;
  const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = titleRegex.exec(block)?.[1] ?? "";
    const link = linkRegex.exec(block)?.[1] ?? "";
    const pubDate = pubRegex.exec(block)?.[1] ?? "";
    const description = descRegex.exec(block)?.[1]?.replace(/<[^>]*>/g, "").slice(0, 200);
    if (title && link) items.push({ title, link, pubDate, source, description });
  }
  return items;
}

export async function fetchLatestNews(limit = 30): Promise<NewsItem[]> {
  const results = await Promise.all(
    RSS_SOURCES.map(async (src) => {
      try {
        const r = await fetch(src.url, {
          next: { revalidate: 600 },
          headers: { "User-Agent": "Mozilla/5.0 TWStockWatcher" },
        });
        if (!r.ok) return [];
        const xml = await r.text();
        return parseRSS(xml, src.source);
      } catch {
        return [];
      }
    }),
  );
  const all = results.flat();
  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all.slice(0, limit);
}

// 簡單詞典法情緒分析（無 AI token 時使用）
export function dictionarySentiment(text: string): { score: number; label: "利多" | "利空" | "中性"; stocks: string[] } {
  const pos = ["大漲", "創高", "看好", "優於預期", "訂單", "營收創新高", "買超", "利多", "強勢", "飆漲", "突破", "登高"];
  const neg = ["大跌", "創低", "看壞", "低於預期", "虧損", "賣超", "利空", "警訊", "下修", "崩", "跳水", "重挫"];
  let score = 0;
  pos.forEach((w) => { if (text.includes(w)) score += 0.2; });
  neg.forEach((w) => { if (text.includes(w)) score -= 0.2; });
  score = Math.max(-1, Math.min(1, score));
  const stocks = Array.from(new Set(text.match(/\b\d{4}\b/g) ?? []));
  return { score, label: score > 0.2 ? "利多" : score < -0.2 ? "利空" : "中性", stocks };
}
