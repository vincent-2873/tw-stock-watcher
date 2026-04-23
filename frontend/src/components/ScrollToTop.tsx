"use client";

import { useEffect } from "react";

/**
 * Bug 7(CLAUDE.md 鐵則 7):個股頁預設停在頁面頂部。
 * 路由參數變更時 scrollTo(0,0)。放在個股頁最上層當 mount effect。
 */
export function ScrollToTop({ deps = [] }: { deps?: unknown[] }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    // 延遲一個 frame 再來一次 — 有的子元件掛載時會觸發 scroll
    const id = window.setTimeout(() => window.scrollTo(0, 0), 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}
