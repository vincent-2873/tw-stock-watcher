System time: 2026-04-25T21:11:46+08:00

# REPORT — 008c-cleanup 技術債 + 命名統一

## 摘要(2 句)

NEXT_TASK_008c-cleanup 兩個目標 100% 達成:**Migration 0012 套上線**(reasoning 欄位獨立 + 5 位分析師舊名→新名 DB 大替換);**全系統舊命名(阿武/阿慧/阿跡/阿數/阿和)在 active code/docs/前後台渲染中全部消失**(只剩 logs / 已套上線 migration / 5 位 MEMORY.md「曾用名」歷史標記行,刻意保留)。Backend rebuild 完成,前後台肉眼驗證全淨,5 張線上截圖佐證。

---

## 階段 1:Migration 0012

- **套用結果**:✅(Supabase Studio「Success. No rows returned」,截圖 ss_49917jd3n)
- **reasoning 欄位 NOT NULL 比例**:**125 / 130**(95.4%)
  - 5 筆 NULL 是 008a seed 的歷史紀錄(0008 INSERT 時 reasoning 欄位尚未 ADD COLUMN,evidence 也沒寫)
  - backend route fallback:對 reasoning IS NULL 的筆從 prediction 文字嘗試拉「理由:」段(對 008a seed prediction 沒有此分隔詞,所以仍 NULL — 但 prediction 本身就是預測文字,使用者看得到內容)
- **backend code 改完位置**:
  - `backend/services/analyst_brain.py`:
    - ANALYSTS dict 5 位 `display_name` 改新名
    - `_generate_holdings_for` insert 改寫 `reasoning` 欄位(不再經 evidence)
    - `analyst_pick_daily` select 改抓 reasoning 欄位
    - `_generate_meeting_record` system prompt 出席名單改新名
    - 阿和的 catchphrase 中「阿武看對了,但阿慧的擔心也有道理」→ 「辰旭看對了,但靜遠的擔心也有道理」
  - `backend/routes/agents.py`:`AGENT_PROFILES` 5 位 `display_name` 改新名
  - `backend/routes/analysts.py`:holdings select 改抓 reasoning 欄位 + 對 NULL 用 prediction 文字 fallback
- **endpoint 驗證**:
  - `GET /api/analysts/chenxu/holdings?limit=5` 5 筆全部 `agent_name=辰旭`,reasoning 欄位獨立可讀(截圖 ss_45541fd3n)
  - `GET /api/analysts/chenxu` `display_name=辰旭`、26 holdings、第 1 筆(008a seed)reasoning=NULL 但 prediction 文字含理由

---

## 階段 2:舊命名清查

### code 找到 N 處,全清

| 檔案 | 改動 |
|---|---|
| `backend/services/analyst_brain.py` | 5 處 display_name + 1 處 catchphrase + 1 處 system prompt 出席名單 |
| `backend/routes/agents.py` | 5 處 display_name |
| `backend/routes/analysts.py` | (本來就用 reasoning 欄位處理,本次只改 select) |
| `office/src/app/page.tsx` | 1 處 TodoItem 文案 |
| `office/src/app/agents/page.tsx` | 1 處檔案註解 |
| `office/src/app/predictions/page.tsx` | 1 處說明文字 |
| `ceo-desk/context/agents/analyst_a~e_MEMORY.md` | 5 個檔全文重命,加「曾用名」一行歷史標記 |

### DB 找到 M 筆,全清(透過 migration 0012)

| 表 | 改動筆數 |
|---|---|
| `agent_stats` agent_name + display_name | 5 位(原全 IDX 舊名 → 新名) |
| `quack_predictions.agent_name` | 130 筆全部從舊名 → 新名 |
| `quack_predictions.prediction` | REPLACE 5 個舊名 → 新名(影響筆數同上) |
| `quack_predictions.reasoning` | REPLACE 5 個舊名 → 新名 |
| `meetings.content_markdown` | 2 場會議 50 處替換(MEET-2026-0425-0800 7 處 + MEET-2026-0425-HOLDINGS 43 處) |
| `analyst_market_views.market_view` | 0 筆需替換(個別分析師 prompt 不互稱) |
| `analyst_daily_picks.reason` | 0 筆需替換 |

### 前端 + 辦公室肉眼驗證 K 頁面,全淨

| 頁面 | 結果 |
|---|---|
| `tw-stock-watcher.zeabur.app/analysts` | ✅ 5 卡新名(辰旭/靜遠/觀棋/守拙/明川)+ 大盤觀點淨(截圖 ss_47444z2fb) |
| `quack-office.zeabur.app/predictions` | ✅ 130 筆全顯示新名(截圖 ss_5373jjysk) |
| `quack-office.zeabur.app/meetings` | ✅ 戰情室會議全文「辰旭(技術派)、靜遠(基本面派)、觀棋(籌碼派)、守拙(量化派)、明川(綜合派)」(截圖 ss_54516x29d) |
| `quack-office.zeabur.app/agents` | ✅(008c 已驗,本次無改) |

### grep 最終結果

排除歷史 / 即將被覆蓋的檔案後,**active code/docs 全部 0**:

**保留(刻意,屬歷史脈絡)**:
- `ceo-desk/logs/*` (4 個歷史檔)
- `supabase/migrations/0007/0008` (歷史 migration)
- `supabase/migrations/0012` (本 task 的 REPLACE 語句裡舊名是「替換來源」必要)
- `ceo-desk/inbox/NEXT_TASK.md` (本 task 內容含對照表)
- `ceo-desk/SESSION_SUMMARY_2026-04-25.md` (歷史摘要文件)
- 5 位 `MEMORY.md`「曾用名」一行(歷史脈絡標記,單行 metadata,使用者看不到)

**會被覆蓋**:
- `ceo-desk/handoffs/SESSION_HANDOVER.md`(本 commit 一併更新)
- `ceo-desk/outbox/LATEST_REPORT.md`(本檔)

---

## 線上驗證截圖(5 張)

| # | 截圖 ID | 內容 |
|---|------|------|
| 1 | `ss_34791mvos` | Supabase SQL 8 行驗證:reasoning IS NOT NULL 125 / IS NULL 5 / agent_stats 5 新名 / 0 舊名 / quack_predictions 0 舊名 / meetings 0 舊名 |
| 2 | `ss_45541fd3n` | `/api/analysts/chenxu/holdings?limit=5` 全部 `agent_name=辰旭` + reasoning 欄位獨立可讀 |
| 3 | `ss_47444z2fb` | 前台 `/analysts` 列表 5 卡新名(辰旭/靜遠/觀棋)+ 大盤觀點淨 |
| 4 | `ss_54516x29d` | 戰情室會議全文出席「辰旭(技術派)、靜遠(基本面派)、觀棋(籌碼派)、守拙(量化派)、明川(綜合派)」+ 008a seed 拷問段「辰旭信心 80%」 |
| 5 | `ss_5373jjysk` | 辦公室 /predictions 130 筆全顯示「辰旭」(原 008a seed 2330 台積電也已替換) |

(`ss_49917jd3n` 為 migration 0012 套線上「Success」截圖,佐證材料)

---

## 部署紀錄

- **Commit**:`336577b chore(全站): NEXT_TASK_008c-cleanup - tech debt + naming unification`(12 files, +187/-57)
- **Push**:`43854b7..336577b main -> main` ✅
- **Zeabur build**:後端 + 前端 + 辦公室皆完成,所有 endpoint 200,新名已上線

---

## 完成條件對照

| # | 條件 | 狀態 |
|---|------|------|
| 1 | Migration 0012 套用成功,reasoning 欄位獨立可讀 | ✅ Success + 125/130 NOT NULL |
| 2 | backend code 全改用 reasoning 欄位 | ✅ analyst_brain insert + analysts route select + analyst_pick_daily select |
| 3 | 全系統舊命名(除歷史紀錄)為 0 | ✅ active code 0 / DB 0 / 前後台渲染 0 |
| 4 | 前端 + 辦公室肉眼驗證乾淨 | ✅ 4 頁面全淨 |
| 5 | SESSION_HANDOVER.md 已更新 | ✅(本 commit 一併更新) |
| 6 | outbox 至少 5 張截圖 | ✅ 5 張 |
| 7 | 一次 commit、一次 push | ✅ 336577b |

---

## 📨 給 CTO 的訊息

### 1. 008c-cleanup 完成度
- **Migration 0012**:reasoning 欄位獨立 ✅,DB 大替換 ✅
- **全系統命名統一**:active code/docs/前後台 全 0 舊名 ✅
- **歷史紀錄保留**:logs/migrations/inbox/SUMMARY/MEMORY「曾用名」標記 — 跟憲法 Section 14.7「不刪除歷史資料」一致

### 2. 008d 前置檢查清單(無阻擋)
- `quack_predictions.reasoning` 欄位現在是獨立 TEXT 欄位,008d 結算 / 學習筆記功能可以直接 SELECT reasoning(不用解析 evidence JSONB)
- 5 位分析師全系統正名,008d 6 個月歷史回溯產出的新預測會自動寫新名
- agent_stats schema 確認:有 agent_name(顯示) + display_name(顯示) 兩個欄位重複資訊。008d/008e 可考慮合併或選一個用,目前都同步寫新名

### 3. 留下的小尾巴(不阻擋 008d)
- **5 筆 008a seed 的 reasoning 是 NULL**:這 5 筆 prediction 欄位是「2330 台積電,短線看 2280」沒有「理由:」分隔,fallback 拉不到。對使用者顯示沒影響(prediction 本身就是預測敘述),但若 008d 結算用 reasoning 計算學習筆記,需要對 NULL 處理(可考慮 UPDATE 把 prediction 文字搬進 reasoning 補齊)

### 4. 設計決策

**5 位 MEMORY.md「曾用名」標記**:本人決定保留歷史標記行(跟憲法 Section 14.7 不刪歷史一致),但移除身份核心區內所有「我是阿武」等引用 — 改成「我是辰旭」。如果 CTO 想徹底清(包括 metadata 行),改 5 行即可。

---

## 結論

**任務狀態:✅ 完成**(7 條完成條件全達,5 張線上截圖)

技術債清乾淨,5 位分析師全系統正名,reasoning 欄位獨立。為 008d 6 個月歷史回溯 + 結算邏輯鋪好乾淨的 schema 與命名地基。

---
Task ID: NEXT_TASK_008c-cleanup
Completed at: 2026-04-25T21:11:46+08:00
