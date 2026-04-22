import { NextRequest, NextResponse } from "next/server";
import { broadcastMessage } from "@/lib/integrations/line";

// POST /api/line/test — 測試用，廣播一則訊息到官方帳號所有好友
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({ text: "TW Stock Watcher 測試訊息" })) as { text?: string };
  try {
    const r = await broadcastMessage([
      { type: "text", text: body.text ?? "TW Stock Watcher 測試訊息 📈" },
    ]);
    return NextResponse.json({ ok: true, result: r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
