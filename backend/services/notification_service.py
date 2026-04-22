"""
通知服務 — LINE Messaging API + Email

LINE Messaging API(v3):
- 用 LINE_CHANNEL_ACCESS_TOKEN push 給 Vincent
- 目標 user_id 存在 LINE_USER_ID(第一次用 webhook 取得)

Email 使用 yagmail + Gmail App Password(可選,LINE 為主)。

規則(spec 06, 10):
- 所有 LINE 文字訊息都預期為繁中 + emoji
- 若 push 失敗:3 次 retry + 記錄到 system_health,不中斷流程
- 成本保護:一日 push 次數有上限(預設 50)避免 bug 爆打
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from backend.utils.logger import get_logger

log = get_logger(__name__)


LINE_API = "https://api.line.me/v2/bot/message/push"
LINE_BROADCAST = "https://api.line.me/v2/bot/message/broadcast"
DAILY_PUSH_CAP = int(os.getenv("LINE_DAILY_PUSH_CAP", "50"))

_pushes_today = 0
_day_epoch = int(time.time() // 86400)


def _reset_if_new_day() -> None:
    global _pushes_today, _day_epoch
    today = int(time.time() // 86400)
    if today != _day_epoch:
        _pushes_today = 0
        _day_epoch = today


@dataclass
class NotifyResult:
    ok: bool
    status: int
    detail: str = ""


class LineNotifier:
    """LINE Messaging API wrapper(Push + Broadcast)。"""

    def __init__(
        self,
        channel_access_token: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        self.token = channel_access_token or os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
        self.user_id = user_id or os.getenv("LINE_USER_ID", "")
        if not self.token:
            log.warning("LINE_CHANNEL_ACCESS_TOKEN 未設定,LINE 推播停用")

    # ==========================================
    # 基礎
    # ==========================================
    def push_text(self, text: str, to: Optional[str] = None) -> NotifyResult:
        """送單則文字訊息。可指定 to(預設 LINE_USER_ID)。"""
        global _pushes_today
        _reset_if_new_day()
        if _pushes_today >= DAILY_PUSH_CAP:
            log.warning(f"LINE 每日 push 上限 {DAILY_PUSH_CAP} 已達,拒絕推播")
            return NotifyResult(False, 0, "daily cap reached")

        if not self.token:
            return NotifyResult(False, 0, "no LINE token")

        target = to or self.user_id
        if not target:
            return NotifyResult(False, 0, "no target user_id")

        # LINE 單則訊息上限 5000 字
        if len(text) > 4800:
            text = text[:4800] + "\n...(已截斷)"

        try:
            r = httpx.post(
                LINE_API,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                json={
                    "to": target,
                    "messages": [{"type": "text", "text": text}],
                },
                timeout=10.0,
            )
            _pushes_today += 1
            if r.status_code == 200:
                log.info(f"LINE push OK len={len(text)} daily={_pushes_today}/{DAILY_PUSH_CAP}")
                return NotifyResult(True, 200)
            log.warning(f"LINE push 失敗 {r.status_code}: {r.text[:200]}")
            return NotifyResult(False, r.status_code, r.text[:300])
        except Exception as e:
            log.error(f"LINE push 例外: {e}")
            return NotifyResult(False, 0, str(e))

    def push_multiple(self, texts: list[str], to: Optional[str] = None) -> list[NotifyResult]:
        """多則訊息(一次最多 5 則)。"""
        return [self.push_text(t, to=to) for t in texts[:5]]

    def broadcast(self, text: str) -> NotifyResult:
        """推播給所有加好友的人(Vincent 個人系統基本上不會用到)。"""
        if not self.token:
            return NotifyResult(False, 0, "no LINE token")
        try:
            r = httpx.post(
                LINE_BROADCAST,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                json={"messages": [{"type": "text", "text": text[:4800]}]},
                timeout=10.0,
            )
            if r.status_code == 200:
                return NotifyResult(True, 200)
            return NotifyResult(False, r.status_code, r.text[:300])
        except Exception as e:
            return NotifyResult(False, 0, str(e))

    # ==========================================
    # Flex Message(卡片版,報告用)
    # ==========================================
    def push_flex(
        self,
        alt_text: str,
        flex_content: dict[str, Any],
        to: Optional[str] = None,
    ) -> NotifyResult:
        """送 Flex Message(有樣式的卡片訊息)。"""
        global _pushes_today
        _reset_if_new_day()
        if _pushes_today >= DAILY_PUSH_CAP:
            return NotifyResult(False, 0, "daily cap reached")
        if not self.token:
            return NotifyResult(False, 0, "no LINE token")
        target = to or self.user_id
        if not target:
            return NotifyResult(False, 0, "no target")
        try:
            r = httpx.post(
                LINE_API,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                json={
                    "to": target,
                    "messages": [
                        {"type": "flex", "altText": alt_text[:400], "contents": flex_content}
                    ],
                },
                timeout=10.0,
            )
            _pushes_today += 1
            if r.status_code == 200:
                return NotifyResult(True, 200)
            return NotifyResult(False, r.status_code, r.text[:300])
        except Exception as e:
            return NotifyResult(False, 0, str(e))


# ==========================================
# 格式化工具(workflow 會用到)
# ==========================================
def format_morning_report(items: list[dict]) -> str:
    """格式化早報為 LINE 文字訊息。
    items: [{stock_id, stock_name, recommendation, total_score, confidence, highlight}]
    """
    lines = ["📅 Vincent 早報", "━━━━━━━━━━━━━"]
    if not items:
        lines.append("今日無強烈訊號,等盤中再觀察。")
    else:
        for i, it in enumerate(items[:5], 1):
            emoji = it.get("recommendation_emoji", "")
            lines.append(
                f"{i}. {emoji} {it['stock_id']} {it.get('stock_name', '')}"
            )
            lines.append(
                f"   分 {it.get('total_score', 0)}/95 · 信 {it.get('confidence', 0)}%"
            )
            if it.get("highlight"):
                lines.append(f"   → {it['highlight']}")
    lines.append("━━━━━━━━━━━━━")
    lines.append("⚠️ 本分析非投資建議,僅供參考。")
    return "\n".join(lines)


def format_day_trade_picks(picks: list[dict]) -> str:
    """格式化當沖推薦。"""
    lines = ["⚡ 當沖推薦(08:30)", "━━━━━━━━━━━━━"]
    if not picks:
        lines.append("今日無合格當沖標的,建議觀望。")
    else:
        for i, p in enumerate(picks[:3], 1):
            lines.append(
                f"{i}. {p['stock_id']} {p.get('stock_name', '')}"
            )
            lines.append(
                f"   類型: {p.get('type', '')}  勝率 {p.get('win_rate', 0)}%"
            )
            lines.append(
                f"   進 {p.get('entry', '?')} 停損 {p.get('stop', '?')} 停利 {p.get('target', '?')}"
            )
    lines.append("━━━━━━━━━━━━━")
    lines.append("🚨 當沖風險極高,嚴守停損。")
    return "\n".join(lines)


def format_closing_report(summary: dict) -> str:
    """格式化盤後報告。"""
    lines = ["📊 盤後解析", "━━━━━━━━━━━━━"]
    lines.append(f"加權收盤: {summary.get('taiex_close', '-')}  "
                 f"{summary.get('taiex_change', '')}")
    lines.append(f"成交量: {summary.get('volume', '-')} 億")
    lines.append(f"三大法人合計: {summary.get('inst_net', '-')} 億")
    lines.append("")
    if summary.get("big_winners"):
        lines.append("🚀 大漲:")
        for w in summary["big_winners"][:5]:
            lines.append(f"  {w['stock_id']} {w.get('name','')} {w.get('change_pct','')}%")
    if summary.get("big_losers"):
        lines.append("📉 大跌:")
        for w in summary["big_losers"][:5]:
            lines.append(f"  {w['stock_id']} {w.get('name','')} {w.get('change_pct','')}%")
    lines.append("━━━━━━━━━━━━━")
    return "\n".join(lines)


def format_alert(alert: dict) -> str:
    """格式化盤中警報。"""
    emoji = {"urgent": "🚨", "warning": "⚠️", "info": "ℹ️"}.get(
        alert.get("severity", "info"), "ℹ️"
    )
    return (
        f"{emoji} {alert.get('title', '盤中提醒')}\n"
        f"{alert.get('stock_id', '')} {alert.get('stock_name', '')}\n"
        f"{alert.get('message', '')}\n"
        f"時間: {alert.get('time', '')} TPE"
    )


# ==========================================
# 全域實例
# ==========================================
_notifier: Optional[LineNotifier] = None


def get_line_notifier() -> LineNotifier:
    global _notifier
    if _notifier is None:
        _notifier = LineNotifier()
    return _notifier
