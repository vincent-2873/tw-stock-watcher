"use client";

import { useState, useEffect } from "react";
import { QuackAvatar, type QuackState } from "./QuackAvatar";

/**
 * 全站右下角浮動呱呱。根據 TPE 時間決定預設情緒:
 *   盤前 07:00-09:00 → observing
 *   盤中 09:00-13:30 → thinking
 *   盤後 13:30-18:00 → studying
 *   晚上 22:00-06:00 → sleeping
 *   其他 → calm
 * 點擊會打開快速動作面板(之後接 AI 對話)。
 */
function stateForTpeHour(hour: number, minute: number): QuackState {
  const hm = hour * 60 + minute;
  if (hm >= 22 * 60 || hm < 6 * 60) return "sleeping";
  if (hm >= 7 * 60 && hm < 9 * 60) return "observing";
  if (hm >= 9 * 60 && hm < 13 * 60 + 30) return "thinking";
  if (hm >= 13 * 60 + 30 && hm < 18 * 60) return "studying";
  return "calm";
}

export function QuackFloating() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<QuackState>("calm");

  useEffect(() => {
    function tick() {
      const d = new Date();
      // 換成 TPE(UTC+8)
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      const tpe = new Date(utcMs + 8 * 3600 * 1000);
      setState(stateForTpeHour(tpe.getHours(), tpe.getMinutes()));
    }
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="叫呱呱出來聊聊"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-transform active:scale-95"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 10px 30px -6px var(--ink-wash), 0 3px 8px -2px var(--ink-wash)",
        }}
      >
        <QuackAvatar state={state} size="md" />
        <span
          className="hidden sm:inline text-sm"
          style={{ fontFamily: "var(--font-serif)", color: "var(--fg-soft)" }}
        >
          呱呱
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-strong)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div className="flex items-start gap-3">
              <QuackAvatar state={state} size="lg" />
              <div className="flex-1">
                <h3
                  className="text-xl mb-1"
                  style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
                >
                  呱──
                </h3>
                <p className="text-sm" style={{ color: "var(--fg-soft)" }}>
                  {speechForState(state)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {QUICK_ACTIONS.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  className="block p-3 rounded-lg text-sm text-center transition-colors"
                  style={{
                    background: "var(--muted)",
                    color: "var(--fg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {a.icon} {a.label}
                </a>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full py-2 text-xs"
              style={{ color: "var(--muted-fg)" }}
            >
              關上茶室的門
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const QUICK_ACTIONS = [
  { icon: "🌊", label: "池塘動靜", href: "/pond" },
  { icon: "🔍", label: "查個股", href: "/stocks" },
  { icon: "🗺️", label: "產業地圖", href: "/map" },
  { icon: "💬", label: "跟呱呱聊", href: "/chat" },
];

function speechForState(s: QuackState): string {
  switch (s) {
    case "sleeping":
      return "夜深了,池塘也該睡了。";
    case "observing":
      return "盤前。呱呱泡好茶了,你今天的功課來了。";
    case "thinking":
      return "盤中。池塘在晃,先別急著跳下去。";
    case "studying":
      return "盤後。今天的池塘很熱鬧,呱呱整理好了。";
    default:
      return "呱呱陪你想清楚每一筆。";
  }
}

export default QuackFloating;
