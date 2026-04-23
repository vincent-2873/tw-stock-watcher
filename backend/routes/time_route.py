"""
時間來源端點 — 以後端(已設 TZ=Asia/Taipei)為權威時鐘。

為什麼要有這個:
- 使用者的瀏覽器系統時鐘可能錯誤(UTC+8 vs 本地混淆、VM 時鐘漂移等)
- 21_FINAL_MASTER_PLAN 0.1 規定 Cron 必須設 TZ=Asia/Taipei
- 前端 Hero 日期必須反映「真正的」TPE 時間,不是 client 機器的時間
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.utils.time_utils import now_tpe

router = APIRouter()


@router.get("/time/now")
def time_now():
    """
    回傳後端此刻的 TPE 時間(多格式)。
    前端 HeroDate client-side 每 60 秒 poll 一次。
    """
    tpe = now_tpe()
    # 英文 Hero 格式: "Thursday · April 23 · 2026 · 18:19 TPE"
    weekdays_en = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    months_en = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    wd = weekdays_en[tpe.weekday()]
    mo = months_en[tpe.month - 1]
    hero_en = (
        f"{wd} · {mo} {tpe.day} · {tpe.year} · "
        f"{tpe.hour:02d}:{tpe.minute:02d} TPE"
    )
    return {
        "iso": tpe.isoformat(),
        "year": tpe.year,
        "month": tpe.month,
        "day": tpe.day,
        "hour": tpe.hour,
        "minute": tpe.minute,
        "second": tpe.second,
        "weekday_en": wd,
        "month_en": mo,
        "hero_en": hero_en,
        "timezone": "Asia/Taipei",
    }
