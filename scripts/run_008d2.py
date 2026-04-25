"""
NEXT_TASK_008d-2:架構 v2 + 後 30 trading days 回溯

關鍵差異 vs 008d-1:
  - architecture_version = 'v2'(全盤分析 + 個性差異新架構)
  - backfill_marker = 'BACKFILL_008d2'
  - 期間:2025-12-08 ~ 2026-01-23(~ 30 trading days,在 008d-1 之前的時段)
  - 5 位分析師人設改為「全盤+個性」(已在 analyst_brain.py 更新)

Phases:
  1: 抓 ~30 trading days 歷史股價
  2: 5 位 × 30 days × 7 picks ≈ 1,050 筆 v2 預測
  3: 結算(BACKFILL_008d2 marker)
  4: learning_notes(v2)
  5: agent_stats v1/v2/normalized 合併計算
  6: 180-day timeline 擴展

執行:
  cd projects/tw-stock-watcher
  python scripts/run_008d2.py --phase all
  # 或單獨跑:
  python scripts/run_008d2.py --phase 2 --picks 7 --max_calls 30 --parallel 5

multi-process(避免 HTTP/2):
  python scripts/run_008d2_one.py analyst_a 30 &
  python scripts/run_008d2_one.py analyst_b 30 &
  ...
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

# ============================================================================
# 期間設定 — v2 (008d-2)
# ============================================================================
START_DATE = date_type(2025, 12, 8)
END_DATE = date_type(2026, 1, 23)
TOTAL_DAYS = (END_DATE - START_DATE).days

BACKFILL_MARKER = "BACKFILL_008d2"
ARCH_VERSION = "v2"

# 也保留 008d-1 的範圍作為後續合併計算 stats / timeline 的全域期間
GLOBAL_PERIOD_START = date_type(2025, 12, 8)
GLOBAL_PERIOD_END = date_type(2026, 4, 25)


def _sb():
    return get_service_client()


# ============================================================================
# Phase 1
# ============================================================================
def phase1_fetch_prices() -> dict:
    sb = _sb()

    r = (
        sb.table("quack_predictions")
        .select("target_symbol")
        .in_("agent_id", analyst_brain.ANALYSTS_ORDER)
        .limit(5000)
        .execute()
    )
    holding_syms = sorted({row["target_symbol"] for row in (r.data or []) if row.get("target_symbol")})
    print(f"[1.0] holdings unique syms: {len(holding_syms)}")

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
    print(f"[1.0] top 100 syms: {len(top_syms)}")

    all_syms = sorted(set(holding_syms) | set(top_syms))
    print(f"[1.0] 合併 unique syms: {len(all_syms)}")

    fetch_start = START_DATE - timedelta(days=10)  # 多抓 10 天讓 AI 看回顧
    fetch_end = END_DATE + timedelta(days=14)       # 多抓 14 天讓 settle 用
    print(f"[1.1] FinMind: {fetch_start} ~ {fetch_end} ({len(all_syms)} 檔)")
    t0 = time.time()
    result = hb.fetch_historical_prices(all_syms, fetch_start, fetch_end, sleep_per_call=0.3)
    elapsed = time.time() - t0
    print(f"[1.2] 完成 — {result['fetched_symbols']}/{len(all_syms)} 成功,{result['total_rows']} rows, {elapsed:.0f}s")
    if result["failed"]:
        print(f"  failed ({len(result['failed'])}): {result['failed'][:30]}")

    KEY = ["2330", "2454", "2317", "3231", "2382", "2308"]
    print(f"[1.3] 抽查重點:")
    for sym in KEY:
        rows = result["coverage"].get(sym, 0)
        status = "✅" if rows >= 25 else ("🟡" if rows > 0 else "❌")
        print(f"  {status} {sym}: {rows} rows")

    return result


# ============================================================================
# Phase 2(multi-process 版見 run_008d2_one.py;此處只支援 sequential / 程序內並行)
# ============================================================================
def phase2_generate_predictions(picks_per_day: int = 7,
                                 max_calls_per_analyst: int = 30,
                                 parallel: int = 1) -> dict:
    """5 位分析師 v2 預測產生。
    parallel >= 2 不建議:HTTP/2 GOAWAY。multi-process 用 run_008d2_one.py。
    """
    from scripts.run_historical_backtest import _run_agent_backfill

    trading_days = hb.get_trading_days(START_DATE, END_DATE)
    print(f"[2.0] 期間內交易日:{len(trading_days)} 天({START_DATE} ~ {END_DATE})")
    if not trading_days:
        print("  ❌ 沒有交易日資料(先跑 phase1)")
        return {"error": "no_trading_days"}

    # 限制 max_calls_per_analyst <= 實際交易日數
    max_calls = min(max_calls_per_analyst, len(trading_days))
    print(f"[2.0] 將跑 max_calls={max_calls}/分析師")

    summary = {}
    t0 = time.time()

    if parallel <= 1:
        for agent_id in analyst_brain.ANALYSTS_ORDER:
            print(f"\n[2.1] === {agent_id} ===")
            summary[agent_id] = _run_agent_backfill(agent_id, trading_days, END_DATE,
                                                    picks_per_day, max_calls,
                                                    backfill_marker=BACKFILL_MARKER,
                                                    architecture_version=ARCH_VERSION)
    else:
        from concurrent.futures import ThreadPoolExecutor
        print(f"\n[2.1] 平行 {parallel} 位(警告:Anthropic HTTP/2 不支援 thread parallel — 建議 multi-process)")
        with ThreadPoolExecutor(max_workers=parallel) as ex:
            futures = {ex.submit(_run_agent_backfill, a, trading_days, END_DATE,
                                 picks_per_day, max_calls,
                                 BACKFILL_MARKER, ARCH_VERSION): a
                       for a in analyst_brain.ANALYSTS_ORDER}
            for fut in futures:
                aid = futures[fut]
                try:
                    summary[aid] = fut.result()
                except Exception as e:
                    summary[aid] = {"error": str(e)}
                    print(f"  ❌ [{aid}] 失敗: {e}")

    elapsed = time.time() - t0
    total_preds = sum(s.get("preds_inserted", 0) for s in summary.values())
    total_calls = sum(s.get("calls", 0) for s in summary.values())
    print(f"\n[2.2] Phase 2 完成:{total_calls} calls / {total_preds} preds / {elapsed/60:.1f} min")
    for a, s in summary.items():
        print(f"  {a}: {s}")
    return summary


# ============================================================================
# Phase 3: settle
# ============================================================================
def phase3_settle() -> dict:
    print(f"\n[3.0] 結算 {BACKFILL_MARKER} 預測(today={GLOBAL_PERIOD_END})")
    t0 = time.time()
    result = hb.settle_all_pending(GLOBAL_PERIOD_END, backfill_marker=BACKFILL_MARKER)
    print(f"[3.1] 結算完成({time.time()-t0:.0f}s):{result}")
    return result


# ============================================================================
# Phase 4: learning_notes(只給 v2 missed)
# ============================================================================
def phase4_learning_notes(max_notes_per_analyst: int = 25, batch_size: int = 8) -> dict:
    print(f"\n[4.0] v2 learning_notes(每位最多 {max_notes_per_analyst},batch={batch_size})")
    summary = {}
    sb = _sb()
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        print(f"\n  --- {agent_id} ---")
        t0 = time.time()
        try:
            # 先撈該 agent v2 missed 且還沒 learning_note 的
            rows = (
                sb.table("quack_predictions")
                .select("id,target_symbol,target_name,direction,target_price,current_price_at_prediction,actual_price_at_deadline,confidence,reasoning,created_at,evidence")
                .eq("agent_id", agent_id)
                .eq("status", "missed")
                .filter("evidence->>backfill_marker", "eq", BACKFILL_MARKER)
                .order("created_at", desc=True)
                .limit(max_notes_per_analyst * 2)
                .execute()
            )
            missed = [m for m in (rows.data or []) if not (m.get("evidence") or {}).get("learning_note_done")]
            missed = missed[:max_notes_per_analyst]
            print(f"    missed v2(未檢討):{len(missed)}")
            written = 0
            batches = 0
            for i in range(0, len(missed), batch_size):
                chunk = missed[i:i + batch_size]
                try:
                    notes = hb.generate_learning_notes_batch(agent_id, chunk)
                    for note in notes:
                        pid = note.get("prediction_id")
                        payload = {
                            "agent_id": agent_id,
                            "prediction_id": pid,
                            "context": (note.get("context") or "")[:500],
                            "mistake": (note.get("mistake") or "")[:500],
                            "lesson": (note.get("lesson") or "")[:800],
                            "correction_plan": (note.get("correction_plan") or "")[:500],
                            "applied": False,
                        }
                        try:
                            sb.table("agent_learning_notes").insert(payload).execute()
                            written += 1
                        except Exception as e:
                            print(f"    insert note failed: {str(e)[:120]}")
                    for m in chunk:
                        try:
                            ev = m.get("evidence") or {}
                            ev["learning_note_done"] = True
                            sb.table("quack_predictions").update({"evidence": ev}).eq("id", m["id"]).execute()
                        except Exception:
                            pass
                    batches += 1
                except Exception as e:
                    print(f"    batch failed: {str(e)[:120]}")
            summary[agent_id] = {"missed": len(missed), "notes_written": written, "batches": batches}
            print(f"    {agent_id}: missed={len(missed)}, notes={written}, batches={batches} ({time.time()-t0:.0f}s)")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    return summary


# ============================================================================
# Phase 5: agent_stats v1 / v2 / normalized
# ============================================================================
STRICTNESS_BY_AGENT = {
    "analyst_a": 1.0,    # strict
    "analyst_b": 0.95,   # strict_window
    "analyst_c": 0.8,    # loose
    "analyst_d": 0.9,    # quant
    "analyst_e": 0.7,    # segmented
}


def phase5_recompute_stats() -> dict:
    """重算 agent_stats:
    - 既有欄位:整體 win_rate(v1+v2 合併)、best/worst symbol 等
    - 計算 v1_winrate, v2_winrate(本地計算後印,DB 寫入需 migration 0014 套上線後才生效)
    """
    sb = _sb()
    print(f"\n[5.0] agent_stats 重算({GLOBAL_PERIOD_START} ~ {GLOBAL_PERIOD_END})")
    summary = {}
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        try:
            # 全量撈該 agent 的所有預測
            rows = (
                sb.table("quack_predictions")
                .select("id,target_symbol,status,created_at,evidence")
                .eq("agent_id", agent_id)
                .limit(10000)
                .execute()
            )
            preds = rows.data or []

            # 分類 v1 / v2
            v1_preds = []
            v2_preds = []
            for p in preds:
                ev = p.get("evidence") or {}
                if ev.get("architecture_version") == "v2":
                    v2_preds.append(p)
                else:
                    v1_preds.append(p)

            # 整體 stats(原 recompute_agent_stats)
            r = hb.recompute_agent_stats(agent_id, GLOBAL_PERIOD_START, GLOBAL_PERIOD_END)

            def _wr(lst):
                settled = [p for p in lst if p.get("status") in ("hit", "missed")]
                if not settled:
                    return None, 0, 0, 0
                hits = sum(1 for p in settled if p["status"] == "hit")
                return round(hits / len(settled), 4), hits, len(settled) - hits, len(settled)

            v1_wr, v1_hits, v1_misses, v1_settled = _wr(v1_preds)
            v2_wr, v2_hits, v2_misses, v2_settled = _wr(v2_preds)

            coef = STRICTNESS_BY_AGENT.get(agent_id, 1.0)
            normalized = round((r.get("win_rate") or 0) * coef, 4) if r.get("win_rate") is not None else None

            # 嘗試寫入新欄位(若 migration 0014 已套會成功;否則略過)
            extra_payload = {
                "v1_predictions": len(v1_preds),
                "v1_hits": v1_hits,
                "v1_misses": v1_misses,
                "v1_winrate": v1_wr,
                "v2_predictions": len(v2_preds),
                "v2_hits": v2_hits,
                "v2_misses": v2_misses,
                "v2_winrate": v2_wr,
                "normalized_winrate": normalized,
                "strictness_coefficient": coef,
            }
            try:
                sb.table("agent_stats").update(extra_payload).eq("agent_id", agent_id).execute()
                wrote = True
            except Exception as e:
                wrote = False
                print(f"    ({agent_id}) 新欄位寫入失敗(可能 migration 0014 未套):{str(e)[:120]}")

            summary[agent_id] = {
                "total": r["total_predictions"],
                "win_rate": r.get("win_rate"),
                "v1_predictions": len(v1_preds),
                "v1_winrate": v1_wr,
                "v2_predictions": len(v2_preds),
                "v2_winrate": v2_wr,
                "normalized": normalized,
                "coef": coef,
                "wrote_extra": wrote,
                "best": r.get("best_symbol"),
                "worst": r.get("worst_symbol"),
            }
            wr_str = f"{r['win_rate']*100:.1f}%" if r.get('win_rate') is not None else "—"
            v1s = f"{v1_wr*100:.1f}%" if v1_wr is not None else "—"
            v2s = f"{v2_wr*100:.1f}%" if v2_wr is not None else "—"
            ns = f"{normalized*100:.1f}%" if normalized is not None else "—"
            print(f"  {agent_id}: total={r['total_predictions']} wr={wr_str} v1={v1s}({len(v1_preds)}) v2={v2s}({len(v2_preds)}) norm={ns} coef={coef}")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    return summary


# ============================================================================
# Phase 6: timeline 擴展到 180 days
# ============================================================================
def phase6_timeline() -> dict:
    print(f"\n[6.0] 全期 timeline({GLOBAL_PERIOD_START} ~ {GLOBAL_PERIOD_END})")
    summary = {}
    for agent_id in analyst_brain.ANALYSTS_ORDER:
        try:
            n = hb.compute_winrate_timeline(agent_id, GLOBAL_PERIOD_START, GLOBAL_PERIOD_END)
            summary[agent_id] = n
            print(f"  {agent_id}: {n} 筆")
        except Exception as e:
            summary[agent_id] = {"error": str(e)}
            print(f"  {agent_id} FAIL: {e}")
    return summary


# ============================================================================
# Main
# ============================================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", default="all")
    parser.add_argument("--picks", type=int, default=7)
    parser.add_argument("--max_calls", type=int, default=30)
    parser.add_argument("--parallel", type=int, default=1)
    parser.add_argument("--notes_max", type=int, default=25)
    parser.add_argument("--notes_batch", type=int, default=8)
    args = parser.parse_args()

    print(f"=== NEXT_TASK_008d-2 v2 架構回溯 ({START_DATE} ~ {END_DATE}, marker={BACKFILL_MARKER}) ===")
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

    print("\n=== Done ===")


if __name__ == "__main__":
    sys.exit(main() or 0)
