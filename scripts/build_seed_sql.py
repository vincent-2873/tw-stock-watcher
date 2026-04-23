"""
Produce a single self-contained SQL file combining migration 0003 and all
three JSON seed imports. Paste & run in Supabase SQL Editor.

Output: scripts/out/vsis_upgrade_seed.sql
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / "supabase" / "migrations" / "0003_industries_topics_ecosystems.sql"
INBOX = ROOT / "inbox" / "files"
OUT_DIR = ROOT / "scripts" / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "vsis_upgrade_seed.sql"
# Committed seed file (INSERTs only, for fetching via GitHub raw)
SEED_DIR = ROOT / "supabase" / "seed"
SEED_DIR.mkdir(parents=True, exist_ok=True)
SEED_OUT = SEED_DIR / "vsis_inserts.sql"


def pg_quote(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    # string
    s = str(v).replace("'", "''")
    return f"'{s}'"


def make_insert(table: str, rows: list[dict], conflict: str) -> str:
    if not rows:
        return f"-- no rows for {table}\n"
    cols = list(rows[0].keys())
    col_list = ", ".join(cols)
    values = []
    for r in rows:
        values.append("(" + ", ".join(pg_quote(r[c]) for c in cols) + ")")
    update = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c != conflict)
    return (
        f"INSERT INTO {table} ({col_list}) VALUES\n  "
        + ",\n  ".join(values)
        + f"\nON CONFLICT ({conflict}) DO UPDATE SET {update};\n"
    )


def industries() -> list[dict]:
    data = json.loads((INBOX / "INDUSTRIES_DATA.json").read_text(encoding="utf-8"))
    rows = []
    for lvl1 in data.get("level_1_categories", []):
        rows.append({
            "id": lvl1["id"],
            "name": lvl1["name"],
            "parent_id": None,
            "level": 1,
            "icon": lvl1.get("icon"),
            "description": lvl1.get("description"),
            "heat_level": lvl1.get("heat_level"),
            "heat_score": None,
            "representative_stocks": [],
            "key_drivers": [],
            "related_topics": [],
            "meta": {},
        })
        for sub in lvl1.get("sub_industries", []):
            rows.append({
                "id": sub["id"],
                "name": sub["name"],
                "parent_id": lvl1["id"],
                "level": 2,
                "icon": None,
                "description": None,
                "heat_level": None,
                "heat_score": None,
                "representative_stocks": sub.get("representative_stocks", []),
                "key_drivers": sub.get("key_drivers", []),
                "related_topics": [],
                "meta": {},
            })
    return rows


def topics() -> list[dict]:
    data = json.loads((INBOX / "TOPICS_DATA.json").read_text(encoding="utf-8"))
    static_keys = {
        "id", "name", "industry_ids", "heat_score", "heat_trend",
        "start_date", "expected_duration_days", "expected_end_date",
        "status", "stage", "catalysts", "supply_chain", "ai_summary",
        "investment_strategy", "avoid_list", "risk_factors",
    }
    return [{
        "id": t["id"],
        "name": t["name"],
        "industry_ids": t.get("industry_ids", []),
        "heat_score": t.get("heat_score"),
        "heat_trend": t.get("heat_trend"),
        "start_date": t.get("start_date"),
        "expected_duration_days": t.get("expected_duration_days"),
        "expected_end_date": t.get("expected_end_date"),
        "status": t.get("status"),
        "stage": t.get("stage"),
        "catalysts": t.get("catalysts", []),
        "supply_chain": t.get("supply_chain", {}),
        "ai_summary": t.get("ai_summary"),
        "investment_strategy": t.get("investment_strategy", {}),
        "avoid_list": t.get("avoid_list", []),
        "risk_factors": t.get("risk_factors", []),
        "meta": {k: v for k, v in t.items() if k not in static_keys},
    } for t in data.get("active_topics", [])]


def ecosystems() -> list[dict]:
    data = json.loads((INBOX / "ECOSYSTEMS_DATA.json").read_text(encoding="utf-8"))
    static_keys = {
        "anchor_ticker", "anchor_name", "anchor_english", "anchor_type",
        "industry", "global_position", "market_cap_ntd",
        "current_price_range", "key_description", "customers",
        "cloud_customers", "suppliers", "competitors",
        "downstream_partners", "taiwan_beneficiary_stocks",
        "financial_projection",
    }
    return [{
        "anchor_ticker": e["anchor_ticker"],
        "anchor_name": e.get("anchor_name", ""),
        "anchor_english": e.get("anchor_english"),
        "anchor_type": e.get("anchor_type"),
        "industry": e.get("industry"),
        "global_position": e.get("global_position"),
        "market_cap_ntd": e.get("market_cap_ntd"),
        "current_price_range": e.get("current_price_range"),
        "key_description": e.get("key_description"),
        "customers": e.get("customers", []),
        "cloud_customers": e.get("cloud_customers", []),
        "suppliers": e.get("suppliers", []),
        "competitors": e.get("competitors", []),
        "downstream_partners": e.get("downstream_partners", {}),
        "taiwan_beneficiary_stocks": e.get("taiwan_beneficiary_stocks", []),
        "financial_projection": e.get("financial_projection", {}),
        "meta": {k: v for k, v in e.items() if k not in static_keys},
    } for e in data.get("ecosystems", [])]


def main():
    mig_sql = MIG.read_text(encoding="utf-8")
    ind_rows = industries()
    tp_rows = topics()
    eco_rows = ecosystems()
    out = [
        "-- =====================================================",
        "-- VSIS Upgrade Seed — industries / topics / ecosystems",
        "-- Paste & Run in Supabase SQL Editor (single transaction)",
        "-- =====================================================",
        "BEGIN;",
        mig_sql,
        f"-- {len(ind_rows)} industries rows",
        make_insert("industries", ind_rows, "id"),
        f"-- {len(tp_rows)} topics rows",
        make_insert("topics", tp_rows, "id"),
        f"-- {len(eco_rows)} ecosystems rows",
        make_insert("ecosystems", eco_rows, "anchor_ticker"),
        "COMMIT;",
        "-- Verify --",
        "SELECT 'industries' AS t, COUNT(*) FROM industries",
        "UNION ALL SELECT 'topics', COUNT(*) FROM topics",
        "UNION ALL SELECT 'ecosystems', COUNT(*) FROM ecosystems;",
    ]
    OUT.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes) — ind={len(ind_rows)} tp={len(tp_rows)} eco={len(eco_rows)}")

    # also produce a committable INSERT-only file (no DDL, for GitHub raw fetch)
    inserts = [
        "-- Auto-generated by scripts/build_seed_sql.py — do not edit.",
        "BEGIN;",
        f"-- {len(ind_rows)} industries rows",
        make_insert("industries", ind_rows, "id"),
        f"-- {len(tp_rows)} topics rows",
        make_insert("topics", tp_rows, "id"),
        f"-- {len(eco_rows)} ecosystems rows",
        make_insert("ecosystems", eco_rows, "anchor_ticker"),
        "COMMIT;",
    ]
    SEED_OUT.write_text("\n".join(inserts), encoding="utf-8")
    print(f"wrote {SEED_OUT} ({SEED_OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
