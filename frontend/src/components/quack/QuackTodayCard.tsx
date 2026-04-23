"use client";

import { useEffect, useState } from "react";
import { QuackAvatar, type QuackState } from "./QuackAvatar";

type Session = "pre" | "open" | "lunch" | "close" | "after" | "night";

function sessionFor(hour: number, minute: number): Session {
  const hm = hour * 60 + minute;
  if (hm < 6 * 60) return "night";
  if (hm < 8 * 60 + 30) return "pre";
  if (hm < 12 * 60) return "open";
  if (hm < 13 * 60 + 30) return "lunch";
  if (hm < 15 * 60) return "close";
  if (hm < 21 * 60) return "after";
  return "night";
}

const LINES: Record<Session, { title: string; body: string; state: QuackState }> = {
  pre: {
    title: "呱呱泡好茶了。",
    body: "你今天的功課來了。先看一眼池塘動靜,再決定要不要跳進去。",
    state: "observing",
  },
  open: {
    title: "池塘正在晃。",
    body: "盤中別急著下手。先讓呱呱幫你看看三大法人的節奏。",
    state: "thinking",
  },
  lunch: {
    title: "中場喘口氣。",
    body: "午盤是噪音最多的時候,呱呱建議你先吃飯。",
    state: "calm",
  },
  close: {
    title: "尾盤在拉鋸。",
    body: "最後半小時決定了今天的故事。留意急拉或急殺。",
    state: "observing",
  },
  after: {
    title: "今天的池塘很熱鬧,呱呱整理好了。",
    body: "看一下盤後重點,明天會不會有新的動靜。",
    state: "studying",
  },
  night: {
    title: "夜深了,池塘也該睡了。",
    body: "要看美股嗎?或是看呱呱讀書?",
    state: "sleeping",
  },
};

export function QuackTodayCard() {
  const [sess, setSess] = useState<Session>("calm" as Session);

  useEffect(() => {
    function tick() {
      const d = new Date();
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      const tpe = new Date(utcMs + 8 * 3600 * 1000);
      setSess(sessionFor(tpe.getHours(), tpe.getMinutes()));
    }
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const line = LINES[sess] ?? LINES.pre;

  return (
    <section
      className="wabi-card"
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        padding: "28px 24px",
      }}
    >
      <div className="flex items-start gap-5">
        <QuackAvatar state={line.state} size="lg" />
        <div className="flex-1 pt-1">
          <div
            className="text-xs mb-2 tracking-wider"
            style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
          >
            今日招呼
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              fontWeight: 500,
              color: "var(--fg)",
              lineHeight: 1.4,
              letterSpacing: "0.03em",
            }}
          >
            {line.title}
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--fg-soft)" }}
          >
            {line.body}
          </p>
        </div>
      </div>
    </section>
  );
}

export default QuackTodayCard;
