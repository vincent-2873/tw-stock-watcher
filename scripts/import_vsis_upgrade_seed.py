"""
VSIS upgrade Phase 1 seed importer.

Applies migration 0003 (industries / topics / ecosystems) and loads the
three JSON seed files into Supabase.

Usage:
    python scripts/import_vsis_upgrade_seed.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import Json

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATION = PROJECT_ROOT / "supabase" / "migrations" / "0003_industries_topics_ecosystems.sql"
INBOX = PROJECT_ROOT / "inbox" / "files"


def load_env() -> str:
    for name in (".env.local", ".env"):
        f = PROJECT_ROOT / name
        if f.exists():
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.startswith("SUPABASE_DB_PASSWORD="):
                    return line.split("=", 1)[1]
    raise SystemExit("SUPABASE_DB_PASSWORD not found in .env.local/.env")


def connect(password: str):
    project_ref = "gvvfzwqkobmdwmqepinx"
    # try several pooler variants (aws-1 supavisor, aws-0 pgbouncer, session 5432 / txn 6543)
    user_full = f"postgres.{project_ref}"
    hosts = [
        "aws-1-ap-southeast-1.pooler.supabase.com",
        "aws-0-ap-southeast-1.pooler.supabase.com",
        "aws-1-ap-northeast-1.pooler.supabase.com",
    ]
    dsns = []
    for h in hosts:
        for port in (6543, 5432):
            dsns.append(dict(
                host=h, port=port, user=user_full,
                password=password, dbname="postgres", sslmode="require",
            ))
    dsns.append(dict(
        host=f"db.{project_ref}.supabase.co", port=5432, user="postgres",
        password=password, dbname="postgres", sslmode="require",
    ))
    last_err = None
    for dsn in dsns:
        try:
            conn = psycopg2.connect(**dsn)
            print(f"[db] connected via {dsn['host']}:{dsn['port']}")
            return conn
        except Exception as e:
            print(f"[db] failed {dsn['host']}: {e}")
            last_err = e
    raise SystemExit(f"no DSN worked: {last_err}")


def apply_migration(conn) -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print(f"[mig] applied {MIGRATION.name}")


def import_industries(conn) -> int:
    data = json.loads((INBOX / "INDUSTRIES_DATA.json").read_text(encoding="utf-8"))
    rows = []
    for lvl1 in data.get("level_1_categories", []):
        rows.append(
            dict(
                id=lvl1["id"],
                name=lvl1["name"],
                parent_id=None,
                level=1,
                icon=lvl1.get("icon"),
                description=lvl1.get("description"),
                heat_level=lvl1.get("heat_level"),
                heat_score=None,
                representative_stocks=[],
                key_drivers=[],
                related_topics=[],
                meta={},
            )
        )
        for sub in lvl1.get("sub_industries", []):
            rows.append(
                dict(
                    id=sub["id"],
                    name=sub["name"],
                    parent_id=lvl1["id"],
                    level=2,
                    icon=None,
                    description=None,
                    heat_level=None,
                    heat_score=None,
                    representative_stocks=sub.get("representative_stocks", []),
                    key_drivers=sub.get("key_drivers", []),
                    related_topics=[],
                    meta={},
                )
            )
    sql = """
        INSERT INTO industries(id, name, parent_id, level, icon, description,
                               heat_level, heat_score, representative_stocks,
                               key_drivers, related_topics, meta)
        VALUES (%(id)s, %(name)s, %(parent_id)s, %(level)s, %(icon)s,
                %(description)s, %(heat_level)s, %(heat_score)s,
                %(representative_stocks)s, %(key_drivers)s, %(related_topics)s,
                %(meta)s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            parent_id = EXCLUDED.parent_id,
            level = EXCLUDED.level,
            icon = COALESCE(EXCLUDED.icon, industries.icon),
            description = COALESCE(EXCLUDED.description, industries.description),
            heat_level = COALESCE(EXCLUDED.heat_level, industries.heat_level),
            representative_stocks = EXCLUDED.representative_stocks,
            key_drivers = EXCLUDED.key_drivers
    """
    with conn.cursor() as cur:
        for r in rows:
            params = dict(r)
            for k in ("representative_stocks", "key_drivers", "related_topics", "meta"):
                params[k] = Json(r[k])
            cur.execute(sql, params)
    conn.commit()
    print(f"[industries] upserted {len(rows)} rows")
    return len(rows)


def import_topics(conn) -> int:
    data = json.loads((INBOX / "TOPICS_DATA.json").read_text(encoding="utf-8"))
    rows = []
    for t in data.get("active_topics", []):
        rows.append(
            dict(
                id=t["id"],
                name=t["name"],
                industry_ids=t.get("industry_ids", []),
                heat_score=t.get("heat_score"),
                heat_trend=t.get("heat_trend"),
                start_date=t.get("start_date"),
                expected_duration_days=t.get("expected_duration_days"),
                expected_end_date=t.get("expected_end_date"),
                status=t.get("status"),
                stage=t.get("stage"),
                catalysts=t.get("catalysts", []),
                supply_chain=t.get("supply_chain", {}),
                ai_summary=t.get("ai_summary"),
                investment_strategy=t.get("investment_strategy", {}),
                avoid_list=t.get("avoid_list", []),
                risk_factors=t.get("risk_factors", []),
                meta={k: v for k, v in t.items() if k not in {
                    "id", "name", "industry_ids", "heat_score", "heat_trend",
                    "start_date", "expected_duration_days", "expected_end_date",
                    "status", "stage", "catalysts", "supply_chain", "ai_summary",
                    "investment_strategy", "avoid_list", "risk_factors",
                }},
            )
        )
    sql = """
        INSERT INTO topics(id, name, industry_ids, heat_score, heat_trend,
                           start_date, expected_duration_days, expected_end_date,
                           status, stage, catalysts, supply_chain, ai_summary,
                           investment_strategy, avoid_list, risk_factors, meta)
        VALUES (%(id)s, %(name)s, %(industry_ids)s, %(heat_score)s, %(heat_trend)s,
                %(start_date)s, %(expected_duration_days)s, %(expected_end_date)s,
                %(status)s, %(stage)s, %(catalysts)s, %(supply_chain)s,
                %(ai_summary)s, %(investment_strategy)s, %(avoid_list)s,
                %(risk_factors)s, %(meta)s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            industry_ids = EXCLUDED.industry_ids,
            heat_score = EXCLUDED.heat_score,
            heat_trend = EXCLUDED.heat_trend,
            start_date = EXCLUDED.start_date,
            expected_duration_days = EXCLUDED.expected_duration_days,
            expected_end_date = EXCLUDED.expected_end_date,
            status = EXCLUDED.status,
            stage = EXCLUDED.stage,
            catalysts = EXCLUDED.catalysts,
            supply_chain = EXCLUDED.supply_chain,
            ai_summary = EXCLUDED.ai_summary,
            investment_strategy = EXCLUDED.investment_strategy,
            avoid_list = EXCLUDED.avoid_list,
            risk_factors = EXCLUDED.risk_factors,
            meta = EXCLUDED.meta
    """
    with conn.cursor() as cur:
        for r in rows:
            params = dict(r)
            for k in ("industry_ids", "catalysts", "supply_chain",
                      "investment_strategy", "avoid_list", "risk_factors", "meta"):
                params[k] = Json(r[k])
            cur.execute(sql, params)
    conn.commit()
    print(f"[topics] upserted {len(rows)} rows")
    return len(rows)


def import_ecosystems(conn) -> int:
    data = json.loads((INBOX / "ECOSYSTEMS_DATA.json").read_text(encoding="utf-8"))
    rows = []
    for e in data.get("ecosystems", []):
        rows.append(
            dict(
                anchor_ticker=e["anchor_ticker"],
                anchor_name=e.get("anchor_name", ""),
                anchor_english=e.get("anchor_english"),
                anchor_type=e.get("anchor_type"),
                industry=e.get("industry"),
                global_position=e.get("global_position"),
                market_cap_ntd=e.get("market_cap_ntd"),
                current_price_range=e.get("current_price_range"),
                key_description=e.get("key_description"),
                customers=e.get("customers", []),
                cloud_customers=e.get("cloud_customers", []),
                suppliers=e.get("suppliers", []),
                competitors=e.get("competitors", []),
                downstream_partners=e.get("downstream_partners", {}),
                taiwan_beneficiary_stocks=e.get("taiwan_beneficiary_stocks", []),
                financial_projection=e.get("financial_projection", {}),
                meta={k: v for k, v in e.items() if k not in {
                    "anchor_ticker", "anchor_name", "anchor_english", "anchor_type",
                    "industry", "global_position", "market_cap_ntd",
                    "current_price_range", "key_description", "customers",
                    "cloud_customers", "suppliers", "competitors",
                    "downstream_partners", "taiwan_beneficiary_stocks",
                    "financial_projection",
                }},
            )
        )
    sql = """
        INSERT INTO ecosystems(anchor_ticker, anchor_name, anchor_english,
                               anchor_type, industry, global_position,
                               market_cap_ntd, current_price_range,
                               key_description, customers, cloud_customers,
                               suppliers, competitors, downstream_partners,
                               taiwan_beneficiary_stocks, financial_projection,
                               meta)
        VALUES (%(anchor_ticker)s, %(anchor_name)s, %(anchor_english)s,
                %(anchor_type)s, %(industry)s, %(global_position)s,
                %(market_cap_ntd)s, %(current_price_range)s,
                %(key_description)s, %(customers)s, %(cloud_customers)s,
                %(suppliers)s, %(competitors)s, %(downstream_partners)s,
                %(taiwan_beneficiary_stocks)s, %(financial_projection)s,
                %(meta)s)
        ON CONFLICT (anchor_ticker) DO UPDATE SET
            anchor_name = EXCLUDED.anchor_name,
            anchor_english = EXCLUDED.anchor_english,
            anchor_type = EXCLUDED.anchor_type,
            industry = EXCLUDED.industry,
            global_position = EXCLUDED.global_position,
            market_cap_ntd = EXCLUDED.market_cap_ntd,
            current_price_range = EXCLUDED.current_price_range,
            key_description = EXCLUDED.key_description,
            customers = EXCLUDED.customers,
            cloud_customers = EXCLUDED.cloud_customers,
            suppliers = EXCLUDED.suppliers,
            competitors = EXCLUDED.competitors,
            downstream_partners = EXCLUDED.downstream_partners,
            taiwan_beneficiary_stocks = EXCLUDED.taiwan_beneficiary_stocks,
            financial_projection = EXCLUDED.financial_projection,
            meta = EXCLUDED.meta
    """
    with conn.cursor() as cur:
        for r in rows:
            params = dict(r)
            for k in ("customers", "cloud_customers", "suppliers", "competitors",
                      "downstream_partners", "taiwan_beneficiary_stocks",
                      "financial_projection", "meta"):
                params[k] = Json(r[k])
            cur.execute(sql, params)
    conn.commit()
    print(f"[ecosystems] upserted {len(rows)} rows")
    return len(rows)


def main() -> None:
    password = load_env()
    conn = connect(password)
    try:
        apply_migration(conn)
        n1 = import_industries(conn)
        n2 = import_topics(conn)
        n3 = import_ecosystems(conn)
        print(f"\n[done] industries={n1} topics={n2} ecosystems={n3}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
