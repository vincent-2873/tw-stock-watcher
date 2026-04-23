-- ============================================
-- Intel Hub 初始資料(Tier 1 來源 + 重點人物 40+)
-- 來自 20_INTEL_HUB_UPGRADE.md
-- ============================================

BEGIN;

-- =============== Tier 1 資料源 ===============
INSERT INTO intel_sources (name, type, region, url, rss_url, language, credibility, update_frequency, tier, is_active) VALUES
  -- 國際財經媒體
  ('Bloomberg',        'news',   'global', 'https://www.bloomberg.com',      'https://feeds.bloomberg.com/markets/news.rss',                         'en', 10, 10, 1, TRUE),
  ('Reuters',          'news',   'global', 'https://www.reuters.com',        'https://www.reutersagency.com/feed/?best-sectors=business-finance',   'en', 10, 10, 1, TRUE),
  ('CNBC',             'news',   'us',     'https://www.cnbc.com',           'https://www.cnbc.com/id/100003114/device/rss/rss.html',               'en',  9,  5, 1, TRUE),
  ('Financial Times',  'news',   'global', 'https://www.ft.com',             'https://www.ft.com/rss/home',                                         'en',  9, 15, 1, TRUE),
  ('Wall Street Journal','news', 'us',     'https://www.wsj.com',            'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',                       'en',  9, 15, 1, TRUE),
  ('MarketWatch',      'news',   'us',     'https://www.marketwatch.com',    'https://feeds.marketwatch.com/marketwatch/topstories/',               'en',  8, 10, 1, TRUE),
  ('Yahoo Finance',    'news',   'us',     'https://finance.yahoo.com',      'https://feeds.finance.yahoo.com/rss/2.0/headline',                    'en',  7,  5, 1, TRUE),
  ('Seeking Alpha',    'blog',   'us',     'https://seekingalpha.com',       'https://seekingalpha.com/feed.xml',                                   'en',  7, 15, 1, TRUE),
  -- 台灣媒體
  ('經濟日報',         'news',   'tw',     'https://money.udn.com',          'https://money.udn.com/rssfeed/news/1001/5590/7324?ch=money',         'zh-TW', 9,  5, 1, TRUE),
  ('鉅亨網',           'news',   'tw',     'https://news.cnyes.com',         'https://news.cnyes.com/rss/cat/tw_stock',                             'zh-TW', 8,  5, 1, TRUE),
  ('MoneyDJ 理財網',   'news',   'tw',     'https://www.moneydj.com',        'https://www.moneydj.com/kmdj/news/newsrsslist.aspx?svc=NR',          'zh-TW', 8, 10, 1, TRUE),
  ('DIGITIMES',        'news',   'tw',     'https://www.digitimes.com.tw',   'https://www.digitimes.com.tw/rss/all.xml',                            'zh-TW', 9, 10, 1, TRUE),
  -- Reddit 論壇
  ('Reddit r/stocks',               'forum', 'global', 'https://reddit.com/r/stocks',              'https://www.reddit.com/r/stocks/.rss',              'en', 6, 15, 1, TRUE),
  ('Reddit r/wallstreetbets',       'forum', 'global', 'https://reddit.com/r/wallstreetbets',      'https://www.reddit.com/r/wallstreetbets/.rss',      'en', 5, 10, 1, TRUE),
  ('Reddit r/investing',            'forum', 'global', 'https://reddit.com/r/investing',           'https://www.reddit.com/r/investing/.rss',           'en', 7, 30, 1, TRUE),
  ('Reddit r/SecurityAnalysis',     'forum', 'global', 'https://reddit.com/r/SecurityAnalysis',    'https://www.reddit.com/r/SecurityAnalysis/.rss',    'en', 8, 60, 1, TRUE),
  ('Hacker News',                   'forum', 'global', 'https://news.ycombinator.com',             'https://hnrss.org/frontpage',                       'en', 7, 30, 1, TRUE),
  -- Twitter / X(爬取另外做)
  ('X - 重點人物',   'twitter', 'global', 'https://x.com', NULL, 'en', 7, 10, 1, TRUE)
ON CONFLICT (name) DO UPDATE SET
  rss_url = EXCLUDED.rss_url,
  update_frequency = EXCLUDED.update_frequency,
  credibility = EXCLUDED.credibility,
  is_active = EXCLUDED.is_active;

-- =============== 重點人物(40+) ===============
INSERT INTO watched_people (name, name_zh, role, category, priority, x_handle, affected_stocks, is_active) VALUES
  -- 🇺🇸 美國政策/央行
  ('Jerome Powell',    'Jerome Powell',  'Fed 主席',              'central_bank', 10, NULL,           '[]'::jsonb, TRUE),
  ('Janet Yellen',     'Janet Yellen',   '美國財政部長',          'central_bank',  9, NULL,           '[]'::jsonb, TRUE),
  ('Donald Trump',     '川普',           '美國總統',              'politician',   10, 'realDonaldTrump','[]'::jsonb, TRUE),
  ('Scott Bessent',    'Scott Bessent',  '財政部長候任',          'politician',    7, NULL,           '[]'::jsonb, TRUE),

  -- 💻 科技巨頭
  ('Elon Musk',        '馬斯克',         'Tesla/SpaceX/X CEO',    'tech_ceo',     10, 'elonmusk',      '["2317","2379","3017"]'::jsonb, TRUE),
  ('Jensen Huang',     '黃仁勳',         'NVIDIA CEO',            'tech_ceo',     10, NULL,            '["2330","3037","3711","2382","2376"]'::jsonb, TRUE),
  ('Sam Altman',       'Sam Altman',     'OpenAI CEO',            'tech_ceo',      9, 'sama',          '["2330","2382","2376"]'::jsonb, TRUE),
  ('Mark Zuckerberg',  '祖克伯',         'Meta CEO',              'tech_ceo',      8, NULL,            '["2330","2382"]'::jsonb, TRUE),
  ('Satya Nadella',    'Satya Nadella',  'Microsoft CEO',         'tech_ceo',      8, 'satyanadella',  '["2330","2382"]'::jsonb, TRUE),
  ('Tim Cook',         '庫克',           'Apple CEO',             'tech_ceo',      9, 'tim_cook',      '["2330","2317","2354","3034","3008"]'::jsonb, TRUE),
  ('Sundar Pichai',    'Sundar Pichai',  'Alphabet CEO',          'tech_ceo',      7, 'sundarpichai',  '["2330"]'::jsonb, TRUE),
  ('Lisa Su',          '蘇姿丰',         'AMD CEO',               'tech_ceo',      9, 'LisaSu',        '["2330","3037","3711"]'::jsonb, TRUE),
  ('Andy Jassy',       'Andy Jassy',     'Amazon CEO',            'tech_ceo',      7, NULL,            '["2330","2382"]'::jsonb, TRUE),
  ('Pat Gelsinger',    'Pat Gelsinger',  'Intel ex-CEO',          'tech_ceo',      6, 'PGelsinger',    '["2330"]'::jsonb, TRUE),

  -- 💰 投資大師
  ('Warren Buffett',   '巴菲特',         'Berkshire Hathaway',    'investor',      9, NULL,            '[]'::jsonb, TRUE),
  ('Cathie Wood',      'Cathie Wood',    'ARK Invest',            'investor',      8, 'CathieDWood',   '[]'::jsonb, TRUE),
  ('Michael Burry',    'Michael Burry',  'Scion Asset',           'investor',      7, 'michaeljburry', '[]'::jsonb, TRUE),
  ('Ray Dalio',        'Ray Dalio',      'Bridgewater',           'investor',      8, 'RayDalio',      '[]'::jsonb, TRUE),
  ('Bill Ackman',      'Bill Ackman',    'Pershing Square',       'investor',      7, 'BillAckman',    '[]'::jsonb, TRUE),
  ('Paul Tudor Jones', 'Paul Tudor Jones','Tudor Investment',     'investor',      7, NULL,            '[]'::jsonb, TRUE),
  ('Stanley Druckenmiller','Druckenmiller','Duquesne Family Office','investor',    7, NULL,            '[]'::jsonb, TRUE),
  ('Howard Marks',     '霍華馬克斯',     'Oaktree Capital',       'investor',      8, NULL,            '[]'::jsonb, TRUE),
  ('Chamath Palihapitiya','Chamath',     'Social Capital',        'investor',      6, 'chamath',       '[]'::jsonb, TRUE),

  -- 🇹🇼 台灣關鍵人物
  ('Wei Che-Chia',     '魏哲家',         '台積電董事長',          'tw_ceo',       10, NULL,            '["2330","3037","3711","2379"]'::jsonb, TRUE),
  ('Young Liu',        '劉揚偉',         '鴻海董事長',            'tw_ceo',        9, NULL,            '["2317","2354","6805"]'::jsonb, TRUE),
  ('Rick Tsai',        '蔡明介',         '聯發科董事長',          'tw_ceo',        9, NULL,            '["2454","3034","3443"]'::jsonb, TRUE),
  ('Cheng-Yang Yang',  '楊正誠',         '央行總裁',              'central_bank',  8, NULL,            '[]'::jsonb, TRUE),
  ('Terry Gou',        '郭台銘',         '鴻海創辦人',            'tw_ceo',        6, NULL,            '["2317"]'::jsonb, TRUE),
  ('Morris Chang',     '張忠謀',         '台積電創辦人',          'tw_ceo',        7, NULL,            '["2330"]'::jsonb, TRUE),
  ('HP Lu',            '盧希鵬',         '華碩董事長',            'tw_ceo',        7, NULL,            '["2357"]'::jsonb, TRUE),
  ('Eric Chang',       '張復鐘',         '富邦金控董事長',        'tw_ceo',        6, NULL,            '["2881"]'::jsonb, TRUE),
  ('Tien-Tsai Hsieh',  '謝金河',         '財信傳媒董事長',        'analyst',       8, NULL,            '[]'::jsonb, TRUE),
  ('Lu Tsung-Yao',     '呂宗耀',         '呂張投資團隊',          'analyst',       8, NULL,            '[]'::jsonb, TRUE),

  -- 📊 重量級分析師
  ('Dan Ives',         'Dan Ives',       'Wedbush 分析師(特斯拉多頭)','analyst', 8, 'DivesTech',     '[]'::jsonb, TRUE),
  ('Gene Munster',     'Gene Munster',   'Deepwater(蘋果)',       'analyst',     7, 'munster_gene',  '["2330","2317"]'::jsonb, TRUE),
  ('Ming-Chi Kuo',     '郭明錤',         'TF Securities(蘋果供應鏈)','analyst', 9, 'mingchikuo',    '["2330","2317","3008","3044"]'::jsonb, TRUE),
  ('Morgan Stanley Tech','大摩科技組',   'Morgan Stanley',        'analyst',      8, NULL,            '[]'::jsonb, TRUE),
  ('Goldman Sachs Asia','高盛亞洲',      'Goldman Sachs',         'analyst',      8, NULL,            '[]'::jsonb, TRUE),

  -- 其他
  ('Vaibhav Taneja',   'Vaibhav Taneja', 'Tesla CFO',             'tech_ceo',      8, NULL,            '["3443","3661","5274","6669"]'::jsonb, TRUE),
  ('David Solomon',    'David Solomon',  'Goldman Sachs CEO',     'investor',      6, NULL,            '[]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT 'intel_sources' AS t, COUNT(*) FROM intel_sources
UNION ALL SELECT 'watched_people', COUNT(*) FROM watched_people
UNION ALL SELECT 'intel_articles', COUNT(*) FROM intel_articles
UNION ALL SELECT 'people_statements', COUNT(*) FROM people_statements;
