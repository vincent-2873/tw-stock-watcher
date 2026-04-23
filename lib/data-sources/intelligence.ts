// 情資來源：美國財經/法人/供應鏈連動 → 台股
// 每個源獨立 try-catch + timeout，永不讓整頁掛掉

type NewsItem = {
  title: string; link: string; pubDate: string; source: string; description?: string;
};

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  try {
    const re = /<item[\s>][\s\S]*?<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const b = m[0];
      const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(b)?.[1]?.trim() ?? "";
      const link = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(b)?.[1]?.trim() ?? "";
      const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1]?.trim() ?? "";
      const description = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/
        .exec(b)?.[1]?.replace(/<[^>]*>/g, "").slice(0, 250) ?? "";
      if (title && link) items.push({ title, link, pubDate, source, description });
    }
  } catch {}
  return items;
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      next: { revalidate: 900 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TWStockBot/1.0)" },
      signal: controller.signal,
    });
    if (!r.ok) return null;
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchSource(url: string, source: string): Promise<NewsItem[]> {
  const r = await fetchWithTimeout(url);
  if (!r) return [];
  try {
    const xml = await r.text();
    return parseRSS(xml, source);
  } catch { return []; }
}

// 已驗證可用的免費 RSS
const US_MARKETS_RSS = [
  { url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", source: "WSJ Markets" },
  { url: "https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness", source: "WSJ Business" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC Markets" },
];

const SUPPLY_CHAIN_RSS = [
  { url: "https://news.cnyes.com/rss/cat/wd_stock", source: "鉅亨網美股" },
  { url: "https://news.cnyes.com/rss/cat/tw_stock", source: "鉅亨網台股" },
  { url: "https://news.cnyes.com/rss/cat/headline", source: "鉅亨網頭條" },
];

export async function fetchUSMarketIntel(limit = 30): Promise<NewsItem[]> {
  const all = await Promise.allSettled(US_MARKETS_RSS.map((s) => fetchSource(s.url, s.source)));
  const merged = all.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return merged.slice(0, limit);
}

export async function fetchSupplyChain(limit = 30): Promise<NewsItem[]> {
  const all = await Promise.allSettled(SUPPLY_CHAIN_RSS.map((s) => fetchSource(s.url, s.source)));
  const merged = all.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return merged.slice(0, limit);
}

export async function fetchPolicyNews(): Promise<NewsItem[]> { return []; }

// 台美供應鏈映射：美國公司 → 相關台股
export const SUPPLY_CHAIN_MAP: Record<string, Array<{ code: string; name: string; role: string }>> = {
  "Apple": [
    { code: "2317", name: "鴻海", role: "iPhone 組裝" },
    { code: "2330", name: "台積電", role: "A 系列 / M 系列晶片代工" },
    { code: "3008", name: "大立光", role: "相機模組" },
    { code: "2382", name: "廣達", role: "Mac 組裝" },
    { code: "3231", name: "緯創", role: "iPhone / iPad 組裝" },
    { code: "2474", name: "可成", role: "金屬機殼" },
    { code: "4938", name: "和碩", role: "iPhone 組裝" },
  ],
  "iPhone": [
    { code: "2317", name: "鴻海", role: "組裝" },
    { code: "2330", name: "台積電", role: "SoC" },
    { code: "3008", name: "大立光", role: "鏡頭" },
  ],
  "NVIDIA": [
    { code: "2330", name: "台積電", role: "GPU 代工" },
    { code: "3017", name: "奇鋐", role: "散熱" },
    { code: "6669", name: "緯穎", role: "伺服器" },
    { code: "2382", name: "廣達", role: "AI 伺服器" },
    { code: "2376", name: "技嘉", role: "AI 伺服器" },
    { code: "3661", name: "世芯-KY", role: "ASIC" },
  ],
  "Tesla": [
    { code: "2377", name: "微星", role: "車用電子" },
    { code: "1519", name: "華城", role: "充電樁" },
    { code: "2308", name: "台達電", role: "電源管理" },
    { code: "3661", name: "世芯-KY", role: "ASIC" },
  ],
  "Microsoft": [
    { code: "2330", name: "台積電", role: "Azure AI 晶片" },
    { code: "2317", name: "鴻海", role: "Surface 製造" },
    { code: "2357", name: "華碩", role: "Windows PC" },
  ],
  "Amazon": [
    { code: "2330", name: "台積電", role: "AWS Graviton" },
    { code: "3661", name: "世芯-KY", role: "Trainium ASIC" },
    { code: "2382", name: "廣達", role: "AWS 伺服器" },
  ],
  "Meta": [
    { code: "2330", name: "台積電", role: "MTIA 晶片" },
    { code: "3661", name: "世芯-KY", role: "ASIC" },
    { code: "3017", name: "奇鋐", role: "散熱" },
  ],
  "Google": [
    { code: "2330", name: "台積電", role: "TPU" },
    { code: "2382", name: "廣達", role: "Google Cloud 伺服器" },
  ],
  "AMD": [
    { code: "2330", name: "台積電", role: "CPU / GPU 代工" },
    { code: "8046", name: "南電", role: "ABF 載板" },
    { code: "3037", name: "欣興", role: "ABF 載板" },
    { code: "6147", name: "頎邦", role: "封測" },
  ],
  "Qualcomm": [
    { code: "2330", name: "台積電", role: "Snapdragon 代工" },
    { code: "2454", name: "聯發科", role: "競爭對手" },
  ],
  "Intel": [
    { code: "2330", name: "台積電", role: "代工合作" },
    { code: "2303", name: "聯電", role: "競爭" },
  ],
  "Broadcom": [
    { code: "2330", name: "台積電", role: "代工" },
    { code: "3661", name: "世芯-KY", role: "ASIC" },
  ],
  "OpenAI": [
    { code: "2330", name: "台積電", role: "客製晶片代工" },
    { code: "6669", name: "緯穎", role: "資料中心" },
  ],
};

export function findRelatedTWStocks(text: string): Array<{ company: string; stocks: Array<{ code: string; name: string; role: string }> }> {
  const results: Array<{ company: string; stocks: Array<{ code: string; name: string; role: string }> }> = [];
  const t = text.toLowerCase();
  for (const [company, stocks] of Object.entries(SUPPLY_CHAIN_MAP)) {
    if (t.includes(company.toLowerCase())) {
      results.push({ company, stocks });
    }
  }
  return results;
}

export const KEY_PEOPLE = {
  "黃仁勳 Jensen Huang": ["Jensen Huang", "NVIDIA CEO", "黃仁勳"],
  "Tim Cook": ["Tim Cook", "Apple CEO"],
  "Jerome Powell": ["Powell", "Fed Chair", "聯準會主席"],
  "Elon Musk": ["Elon Musk", "馬斯克"],
  "Buffett": ["Warren Buffett", "巴菲特", "Berkshire"],
  "Sam Altman": ["Sam Altman", "OpenAI", "奧特曼"],
};
