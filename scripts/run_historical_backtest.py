"""
NEXT_TASK_008d-1 歷史回溯前 90 天 — 主腳本

執行階段:
  Phase 1: 抓 90 天歷史股價(2026-01-26 ~ 2026-04-25)
  Phase 2: 5 位分析師 × 60 個交易日 × 7 筆 = ~2100 筆預測產生
  Phase 3: 對照真實股價判定 hit / miss
  Phase 4: 失敗 learning_notes 批次產生
  Phase 5: 計算 agent_stats 5 位勝率
  Phase 6: 計算每日滾動勝率 timeline

執行方式:
  cd projects/tw-stock-watcher
  python scripts/run_historical_backtest.py [--phase 1|2|3|4|5|6|all]

可分階段執行,中斷後可從特定階段繼續。
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import date as date_type
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import load_env  # noqa: E402, F401

from backend.services import historical_backtest as hb  # noqa: E402
from backend.services import analyst_brain  # noqa: E402
from backend.utils.supabase_client import get_service_client  # noqa: E402

# 回溯期間(today = 2026-04-25)
END_DATE = date_type(2026, 4, 25)
START_DATE = date_type(2026, 1, 26)
TOTAL_DAYS = (END_DATE - START_DATE).days


def _sb():
    return get_service_client()


# ============================================================================
# Phase 1: 抓歷史股價
# ============================================================================
def phase1_fetch_prices() -> dict:
    """抓所有 5 位分析師持倉所涉及的股票 + top 100 股票池,共 ~150 檔。
    抓 START_DATE - 7 天 ~ END_DATE 的日 K(多抓 7 天讓 AI 能看回顧)。
    """
    sb = _sb()

    # 1. 撈分析師現有持倉的 unique 標的
    r = (
        sb.table("quack_predictions")
        .select("target_symbol")
        .in_("agent_id", analyst_brain.ANALYSTS_ORDER)
        .limit(5000)
        .execute()
    )
    holding_syms = sorted({row["target_symbol"] for row in (r.data or []) if row.get("target_symbol")})
    print(f"[1.0] holdings 中 unique syms: {len(holding_syms)}")

    # 2. 撈 stocks 表 top 100(按 score)
    try:
        r2 = (
            sb.table("stocks")
            .select("stock_id")
            .eq("is_active", True)
            .order("current_score", desc=True)
            .limit(100)
            .execute()
        )
        top_syms = [row["stock_id"] for row in (r2.data or []) if row.get("stock_id")]
    except Exception as e:
        print(f"  fetch top stocks failed: {e}")
        top_syms = []
    print(f"[1.0] stocks top 100 syms: {len(top_syms)}")

    all_syms = sorted(set(holding_syms) | set(top_syms))
    print(f"[1.0] 合併 unique syms: {len(all_syms)}")

    fetch_start = START_DATE - timedelta(days=7)
    print(f"[1.1] 抓 FinMind: {fetch_start} ~ {END_DATE}({len(all_syms)} 檔)")
    t0 = time.time()
    result = hb.fetch_historical_prices(all_syms, fetch_start, END_DATE, sleep_per_call=0.3)
    elapsed = time.time() - t0
    print(f"[1.2] 完成 — {result['fetched_symbols']}/{len(all_syms)} 成功,{result['total_rows']} 筆,耗時 {elapsed:.0f}s")
    if result["failed"]:
        print(f"  failed syms ({len(result['failed'])}): {result['failed'][:30]}")

    # 3. 抽查 10 檔重點
    KEY_STOCKS = ["2330", "2454", "2317", "3231", "2382", "2308", "2412", "6505", "3008", "2891"]
    print(f"[1.3] 抽查 10 檔重點:")
    for sym in KEY_STOCKS:
        rows = result["coverage"].get(sym, 0)
        status = "✅" if rows >= 50 else ("🟡" if rows > 0 else "❌")
        print(f"  {status} {sym}: {rows} rows")

    return result


# ============================================================================
# Phase 2: 產生預測
# ============================================================================
def _run_agent_backfill(agent_id: str, trading_days, end: date_type,
                        picks_per_day: int, max_calls_per_analyst: int) -> dict:
    """單一分析師跑完整 backfill。給 ThreadPoolExecutor 用。"""
    sb = _sb()
    name = analyst_brain.ANALYSTS[agent_id]["display_name"]

    # 已有的 backfill 預測日期(避免重跑)
    existing = (
        sb.table("quack_predictions")
        .select("date,evidence")
        .eq("agent_id", agent_id)
        .gte("date", trading_days[0].isoformat())
        .lte("date", trading_days[-1].isoformat())
        .limit(5000)
        .execute()
        .data or []
    )
    skip_dates = set()
    for r in existing:
        ev = r.get("evidence") or {}
        if ev.get("backfill_marker") == "BACKFILL_008d1":
            skip_dates.add(r.get("date"))
    if skip_dates:
        print(f"  [{agent_id}] ↩  跳過已有 backfill 的 {len(skip_dates)} 天")

    summary = {"days_done": 0, "preds_inserted": 0, "errors": 0, "calls": 0}
    for i, td in enumerate(trading_days, 1):
        if td.isoformat() in skip_dates:
            continue
        days_left = (end - td).days
        if days_left < 2:
            continue
        max_deadline = min(14, max(2, days_left - 1))

        try:
            t0 = time.time()
            ctx = hb._build_market_context(td, n_stocks=30)
            preds = hb.generate_predictions_for_day(agent_id, td, ctx,
                                                   n_picks=picks_per_day,
                                                   max_deadline_days=max_deadline)
            inserted = hb.insert_historical_predictions(agent_id, td, preds)
            summary["days_done"] += 1
            summary["preds_inserted"] += len(inserted)
            summary["calls"] += 1
            elapsed = time.time() - t0
            print(f"  [{agent_id}|{name}] {td} → {len(inserted)} preds ({elapsed:.1f}s, day {i}/{len(trading_days)})")
        except Exception as e:
            summary["errors"] += 1
            err_short = str(e)[:200]
            print(f"  [{agent_id}|{name}] {td} FAIL: {type(e).__name__}: {err_short}")
            if summary["errors"] > 8:
                print(f"  ⚠  [{agent_id}] 錯誤過多,中止")
                break

        if summary["calls"] >= max_calls_per_analyst:
            print(f"  ⏹  [{agent_id}] reached max_calls={max_calls_per_analyst}")
            break

    print(f"  ✅ [{agent_id}|{name}] {summary['days_done']} days / {summary['preds_inserted']} preds / {summary['errors']} errors")
    return summary


def phase2_generate_predictions(start: date_type = START_DATE, end: date_type = END_DATE,
                                 picks_per_day: int = 7,
                                 max_calls_per_analyst: int = 60,
                                 parallel: int = 5) -> dict:
    """5 位分析師平行跑 backfill。

    成本估算:
      5 × ~55 calls × 1 call/day = ~275 calls
      每 call ~25s → 平行 5 大約 25 min
    """
    from concurrent.futures import ThreadPoolExecutor

    trading_days = hb.get_trading_days(start, end)
    print(f"[2.0] 期間內交易日:{len(trading_days)} 天({start} ~ {end})")
    if not trading_days:
        print("  ❌ 沒有交易日資料")
        return {"error": "no_trading_days"}

    summary = {}
    t0 = time.time()

    if parallel <= 1:
        for agent_id in analyst_brain.ANALYSTS_ORDER:
            print(f"\n[2.1] === {agent_id} ===")
            summary[agent_id] = _run_agent_backfill(agent_id, trading_days, end, picks_per_day, max_calls_per_analyst)
    else:
        print(f"\n[2.1] 平行執行 {parallel} 位分析師")
        with ThreadPoolExecutor(max_workers=parallel) as ex:
            futures = {ex.submit(_run_agent_backfill, a, trading_days, end, picks_per_day, max_calls_per_analyst): a
                       for a in analyst_brain.ANALYSTS_ORDER}
            for fut in futures:
                aid = futures[fut]
                try:
                    summary[aid] = fut.result()
                except Exception as e:
                    summary[aid] = {"error": str(e)}
                    print(f"  ❌ [{aid}] 整體失敗: {e}")

    elapsed = time.time() - t0
    total_preds = sum(s.get("preds_inserted", 0) for s in summary.values())
    total_calls = sum(s.get("calls", 0) for s in summary.values())
    print(f"\n[2.2] Phase 2 完成:{total_calls} AI calls / {total_preds} preds / 耗時 {elapsed/60:.1f} min")
    for a, s in summary.items():
        print(f"  {a}: {s}")
    return summary


# ============================================================================
# Phase 3: 結算
# ============================================================================
def phase3_settle() -> dict:
    print(f"\n[3.0] 結算所有 pending_settlement 預測(today={END_DATE})")
    t0 = time.time()
    result = hb.settle_all_pending(END_DATE)
    elapsed = time.time() - t0
    print(f"[3.1] 結算完成({elapsed:.0f}s):{result}")
    return result


# ============================================================================
# Phase 4: learning_notes
# ============================================================================
def phase4_learning_notes(max_notes_per_analyst: int = 40, batch_size: int = 8) -> dict:
    print(f"\n[4.0] 產 learning_notes(每位最多 {max_notes_per_analyst} 筆,batch={batch_size})")
    summary = {}
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        print(f"\n  --- {agent_id} ---")
        t0 = time.time()
        try:
            r = hb.write_learning_notes_for_agent(agent_id, batch_size=batch_size, max_notes=max_notes_per_analyst)
            summary[agent_id] = r
            print(f"  {agent_id}: missed={r['missed']}, notes={r['notes_written']}, batches={r['batches']} ({time.time()-t0:.0f}s)")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    return summary


# ============================================================================
# Phase 5: agent_stats
# ============================================================================
def phase5_recompute_stats() -> dict:
    print(f"\n[5.0] 計算 agent_stats(backfill_period={START_DATE} ~ {END_DATE})")
    summary = {}
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        try:
            r = hb.recompute_agent_stats(agent_id, START_DATE, END_DATE)
            summary[agent_id] = r
            wr = r.get("win_rate")
            wr_str = f"{wr*100:.1f}%" if wr is not None else "—"
            print(f"  {agent_id} ({r['agent_name']}): total={r['total_predictions']}, hits={r['hits']}, missed={r['misses']}, wr={wr_str}, best={r.get('best_symbol')}, worst={r.get('worst_symbol')}")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    # 合理性檢查
    win_rates = [s.get("win_rate") for s in summary.values() if isinstance(s, dict) and s.get("win_rate") is not None]
    if win_rates:
        avg = sum(win_rates) / len(win_rates)
        spread = max(win_rates) - min(win_rates)
        print(f"  📊 合理性:平均勝率 {avg*100:.1f}%, 高低差 {spread*100:.1f}%")
        if all(wr > 0.8 for wr in win_rates):
            print("  ⚠  全部 > 80%,可能 AI 太樂觀(回去檢查 prompt)")
        elif all(wr < 0.4 for wr in win_rates):
            print("  ⚠  全部 < 40%,可能 success_criteria 太嚴")
        else:
            print("  ✅ 勝率分布合理")
    return summary


# ============================================================================
# Phase 6: timeline
# ============================================================================
def phase6_timeline() -> dict:
    print(f"\n[6.0] 計算每位每日滾動勝率 timeline")
    summary = {}
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        try:
            n = hb.compute_winrate_timeline(agent_id, START_DATE, END_DATE)
            summary[agent_id] = n
            print(f"  {agent_id}: {n} 筆 timeline")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    return summary


# ============================================================================
# Main
# ============================================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", default="all", help="1|2|3|4|5|6|all")
    parser.add_argument("--picks", type=int, default=7, help="picks per analyst per day")
    parser.add_argument("--max_calls", type=int, default=60, help="max AI calls per analyst (Phase 2)")
    parser.add_argument("--parallel", type=int, default=5, help="parallel analysts in Phase 2")
    parser.add_argument("--notes_max", type=int, default=30, help="max learning_notes per analyst")
    parser.add_argument("--notes_batch", type=int, default=8, help="learning_notes batch size")
    args = parser.parse_args()

    print(f"=== NEXT_TASK_008d-1 歷史回溯 ({START_DATE} ~ {END_DATE},{TOTAL_DAYS} 自然日) ===")
    print(f"Phase: {args.phase}")

    p = args.phase.lower()
    if p in ("all", "1"):
        phase1_fetch_prices()
    if p in ("all", "2"):
        phase2_generate_predictions(picks_per_day=args.picks, max_calls_per_analyst=args.max_calls, parallel=args.parallel)
    if p in ("all", "3"):
        phase3_settle()
    if p in ("all", "4"):
        phase4_learning_notes(max_notes_per_analyst=args.notes_max, batch_size=args.notes_batch)
    if p in ("all", "5"):
        phase5_recompute_stats()
    if p in ("all", "6"):
        phase6_timeline()

    print("\n=== Done. 線上驗證 ===")
    print("  https://vsis-api.zeabur.app/api/analysts")
    print("  https://vsis-api.zeabur.app/api/analysts/chenxu")


if __name__ == "__main__":
    sys.exit(main() or 0)
