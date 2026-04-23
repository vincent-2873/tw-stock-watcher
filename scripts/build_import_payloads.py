"""
Build JSON payloads for /api/admin/upsert_seed from the 3 seed JSON files.

Usage:
    python scripts/build_import_payloads.py industries   # stdout
    python scripts/build_import_payloads.py topics
    python scripts/build_import_payloads.py ecosystems
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "inbox" / "files"


def build_industries() -> dict:
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
    return {
        "table": "industries",
        "rows": rows,
        "conflict": "id",
        "jsonb_fields": ["representative_stocks", "key_drivers", "related_topics", "meta"],
    }


def build_topics() -> dict:
    data = json.loads((INBOX / "TOPICS_DATA.json").read_text(encoding="utf-8"))
    rows = []
    static_keys = {
        "id", "name", "industry_ids", "heat_score", "heat_trend",
        "start_date", "expected_duration_days", "expected_end_date",
        "status", "stage", "catalysts", "supply_chain", "ai_summary",
        "investment_strategy", "avoid_list", "risk_factors",
    }
    for t in data.get("active_topics", []):
        rows.append({
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
        })
    return {
        "table": "topics",
        "rows": rows,
        "conflict": "id",
        "jsonb_fields": [
            "industry_ids", "catalysts", "supply_chain",
            "investment_strategy", "avoid_list", "risk_factors", "meta",
        ],
    }


def build_ecosystems() -> dict:
    data = json.loads((INBOX / "ECOSYSTEMS_DATA.json").read_text(encoding="utf-8"))
    rows = []
    static_keys = {
        "anchor_ticker", "anchor_name", "anchor_english", "anchor_type",
        "industry", "global_position", "market_cap_ntd",
        "current_price_range", "key_description", "customers",
        "cloud_customers", "suppliers", "competitors",
        "downstream_partners", "taiwan_beneficiary_stocks",
        "financial_projection",
    }
    for e in data.get("ecosystems", []):
        rows.append({
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
        })
    return {
        "table": "ecosystems",
        "rows": rows,
        "conflict": "anchor_ticker",
        "jsonb_fields": [
            "customers", "cloud_customers", "suppliers", "competitors",
            "downstream_partners", "taiwan_beneficiary_stocks",
            "financial_projection", "meta",
        ],
    }


BUILDERS = {
    "industries": build_industries,
    "topics": build_topics,
    "ecosystems": build_ecosystems,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in BUILDERS:
        sys.stderr.write(f"usage: {sys.argv[0]} {{industries|topics|ecosystems}}\n")
        sys.exit(1)
    payload = BUILDERS[sys.argv[1]]()
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
