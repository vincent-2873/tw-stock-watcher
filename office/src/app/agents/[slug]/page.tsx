"use client";

/**
 * 辦公室 /agents/[slug] — agent 深度檔案頁(NEXT_TASK_009 階段 3.4)
 *
 * 涵蓋:
 *  - AnalystAvatar/AgentBadge size=lg + 即時 status(30 秒輪詢)
 *  - 完整人設 / 流派 / 個性
 *  - 所有歷史預測(可篩 v1/v2)
 *  - 所有 learning_notes 時間線
 *  - 出席過的會議列表
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type AvatarStatus, STATUS_LABEL } from "@/components/AnalystAvatar";
import { AgentBadge, getAgentDisplayName } from "@/components/AgentBadge";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

const ANALYST_SLUGS_TO_AGENT_ID: Record<string, string> = {
  chenxu: "analyst_a",
  jingyuan: "analyst_b",
  guanqi: "analyst_c",
  shouzhuo: "analyst_d",
  mingchuan: "analyst_e",
};

type Profile = {
  agent_id?: string;
  display_name?: string;
  role?: string;
  emoji?: string;
  department?: string;
  school?: string;
  personality?: string;
  trait_label?: string;
  decision_quirks?: string[];
  catchphrase?: string;
  timeframe?: string;
  risk?: string;
  weights?: Record<string, number>;
  stop_loss_pct?: number;
};

type Stats = {
  total_predictions?: number;
  hits?: number;
  misses?: number;
  win_rate?: number;
  v1_winrate?: number;
  v2_winrate?: number;
  normalized_winrate?: number;
  best_symbol?: string;
};

type Prediction = {
  id: number;
  date?: string;
  target_symbol?: string;
  target_name?: string;
  direction?: string;
  status?: string;
  settled_result?: string;
  evidence?: { architecture_version?: string };
};

type LearningNote = {
  note_id: number;
  date: string;
  context?: string;
  mistake?: string;
  lesson?: string;
};

type Meeting = {
  meeting_id: string;
  meeting_type: string;
  scheduled_at: string;
};

type DeepProfile = {
  slug: string;
  agent_id: string;
  profile: Profile;
  stats: Stats;
  predictions: Prediction[];
  predictions_count: number;
  learning_notes: LearningNote[];
  meetings: Meeting[];
};

type AgentInfo = {
  agent_id: string;
  display_name: string;
  role?: string;
  department?: string;
  school?: string;
  personality?: string;
  catchphrase?: string;
  timeframe?: string;
  risk?: string;
  emoji?: string;
};

const trait_or_role = (p?: Profile) => p?.trait_label || p?.role || p?.school || "—";

export default function AgentDeepProfilePage() {
  const params = useParams<{ slug: string }>();
  const slugParam = params?.slug;

  const [data, setData] = useState<DeepProfile | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [status, setStatus] = useState<{ status: AvatarStatus; status_detail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionFilter, setVersionFilter] = useState<"all" | "v1" | "v2">("all");

  const isAnalyst = !!ANALYST_SLUGS_TO_AGENT_ID[slugParam ?? ""] || (slugParam ?? "").startsWith("analyst_");
  const agentId = ANALYST_SLUGS_TO_AGENT_ID[slugParam ?? ""] || slugParam;

  // 載入 deep profile(投資分析師)或 agent info(部門 agent)
  useEffect(() => {
    if (!slugParam) return;
    let cancelled = false;
    const load = async () => {
      try {
        if (isAnalyst) {
          const r = await fetch(`${API}/api/analysts/${slugParam}/deep_profile`);
          if (!r.ok) {
            if (!cancelled) {
              setError(`API 錯誤 ${r.status}`);
              setLoading(false);
            }
            return;
          }
          const j: DeepProfile = await r.json();
          if (!cancelled) {
            setData(j);
            setLoading(false);
          }
        } else {
          // 部門 agent 用 /api/agents/{agent_id}
          const r = await fetch(`${API}/api/agents/${agentId}`);
          if (!r.ok) {
            if (!cancelled) {
              setError(`API 錯誤 ${r.status}`);
              setLoading(false);
            }
            return;
          }
          const j = await r.json();
          if (!cancelled) {
            setAgentInfo(j);
            setLoading(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(`連線失敗:${e instanceof Error ? e.message : String(e)}`);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slugParam, isAnalyst, agentId]);

  // status 30 秒輪詢
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/agents/${agentId}/status`);
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) {
          setStatus({ status: j.status, status_detail: j.status_detail });
        }
      } catch {
        /* silent */
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [agentId]);

  const filteredPreds = useMemo(() => {
    if (!data?.predictions) return [];
    if (versionFilter === "all") return data.predictions;
    return data.predictions.filter((p) => p.evidence?.architecture_version === versionFilter);
  }, [data, versionFilter]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px`, textAlign: "center" }}>
        <LoadingSpinner size={48} label="載入 agent 檔案中…" />
      </main>
    );
  }

  if (error || (!data && !agentInfo)) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
        <ErrorState title="檔案載入失敗" message={error || "未知錯誤"} />
        <div style={{ marginTop: spacing.lg, textAlign: "center" }}>
          <Link href="/agents" style={{ color: color.accent, textDecoration: "underline" }}>
            ← 回名冊
          </Link>
        </div>
      </main>
    );
  }

  const profile = data?.profile;
  const stats = data?.stats || {};
  const aname = profile?.display_name || agentInfo?.display_name || getAgentDisplayName(agentId ?? "");

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      <div style={{ fontSize: 12, color: color.secondaryText, marginBottom: spacing.md }}>
        <Link href="/" style={{ color: "inherit" }}>
          辦公室
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <Link href="/agents" style={{ color: "inherit" }}>
          名冊
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>{aname}</span>
      </div>

      {/* Hero */}
      <Card padded style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: spacing.lg, alignItems: "center", flexWrap: "wrap" }}>
          <AgentBadge agentId={agentId ?? ""} size="lg" status={status?.status} statusDetail={status?.status_detail} />
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {profile?.trait_label && <Badge tone="accent">{profile.trait_label}</Badge>}
              <Badge tone="default">{profile?.role || agentInfo?.role || "—"}</Badge>
              {status && <Badge tone="info">當前 · {STATUS_LABEL[status.status]}</Badge>}
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: 4 }}>
              {profile?.emoji ?? agentInfo?.emoji ?? ""} {aname}
            </h1>
            <div style={{ color: color.secondaryText, fontSize: 13, marginBottom: spacing.sm }}>
              {trait_or_role(profile)} · {profile?.school || agentInfo?.school || "—"}
            </div>
            {(profile?.catchphrase || agentInfo?.catchphrase) && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: fontSize.body.size,
                  fontStyle: "italic",
                  color: color.primaryText,
                  margin: 0,
                  marginTop: spacing.sm,
                  paddingLeft: spacing.md,
                  borderLeft: `2px solid ${color.accent}`,
                }}
              >
                「{profile?.catchphrase || agentInfo?.catchphrase}」
              </p>
            )}
            {status?.status_detail && (
              <p style={{ marginTop: spacing.sm, fontSize: 12, color: color.secondaryText, fontStyle: "italic" }}>
                · 此刻:{status.status_detail}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 統計 */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <Card>
            <div style={{ fontSize: 11, color: color.secondaryText }}>總預測數</div>
            <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)" }}>
              {stats.total_predictions ?? "—"}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: color.secondaryText }}>合併勝率</div>
            <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)", color: color.accent }}>
              {stats.win_rate != null ? `${(stats.win_rate * 100).toFixed(1)}%` : "—"}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: color.secondaryText }}>v2 勝率</div>
            <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)", color: color.success }}>
              {stats.v2_winrate != null ? `${(stats.v2_winrate * 100).toFixed(1)}%` : "—"}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: color.secondaryText }}>Normalized</div>
            <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)", color: color.warning }}>
              {stats.normalized_winrate != null ? `${(stats.normalized_winrate * 100).toFixed(1)}%` : "—"}
            </div>
          </Card>
        </div>
      )}

      {/* 個性與決策怪癖 */}
      {profile?.decision_quirks && profile.decision_quirks.length > 0 && (
        <Card padded style={{ marginBottom: spacing.lg }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            🎭 決策怪癖
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {profile.decision_quirks.map((q, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.8, color: color.primaryText }}>
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 歷史預測(分析師才有) */}
      {data && (
        <Card padded style={{ marginBottom: spacing.lg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.sm }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0 }}>
              📊 歷史預測({data.predictions_count} 筆)
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "v1", "v2"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVersionFilter(v)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    border: `1px solid ${versionFilter === v ? color.accent : color.borderSubtle}`,
                    background: versionFilter === v ? color.accent : "transparent",
                    color: versionFilter === v ? "#fff" : color.primaryText,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {v === "all" ? "全部" : v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {filteredPreds.length === 0 ? (
            <EmptyState title="這個篩選條件下沒有預測" />
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {filteredPreds.slice(0, 60).map((p) => {
                const tone =
                  p.status === "hit" || p.settled_result === "hit"
                    ? "success"
                    : p.status === "missed" || p.settled_result === "missed"
                      ? "danger"
                      : "default";
                return (
                  <Link
                    key={p.id}
                    href={`https://tw-stock-watcher.zeabur.app/predictions/${p.id}`}
                    target="_blank"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 1fr 80px 80px 80px",
                      gap: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      borderBottom: `1px dashed ${color.borderSubtle}`,
                      color: color.primaryText,
                      textDecoration: "none",
                      transition: "background 200ms ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = color.bgRaised)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span style={{ color: color.secondaryText, fontFamily: "var(--font-mono)" }}>{p.date}</span>
                    <span style={{ fontWeight: 500 }}>
                      {p.target_symbol} {p.target_name}
                    </span>
                    <span style={{ color: color.secondaryText }}>{p.direction}</span>
                    <span>
                      <Badge tone={p.evidence?.architecture_version === "v2" ? "info" : "default"} size="sm">
                        {p.evidence?.architecture_version?.toUpperCase() ?? "—"}
                      </Badge>
                    </span>
                    <span>
                      <Badge tone={tone} size="sm">
                        {p.status === "active" ? "active" : p.settled_result ?? p.status}
                      </Badge>
                    </span>
                  </Link>
                );
              })}
              {filteredPreds.length > 60 && (
                <div style={{ fontSize: 11, color: color.secondaryText, textAlign: "center", marginTop: 8 }}>
                  … 顯示前 60 筆,共 {filteredPreds.length} 筆
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 學習筆記時間線 */}
      {data && data.learning_notes && data.learning_notes.length > 0 && (
        <Card padded style={{ marginBottom: spacing.lg, borderLeft: `3px solid ${color.warning}` }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            📓 學習筆記時間線(最近 25 筆)
          </h3>
          <div style={{ display: "grid", gap: spacing.sm }}>
            {data.learning_notes.map((n) => (
              <div
                key={n.note_id}
                style={{
                  paddingLeft: spacing.md,
                  borderLeft: `2px solid ${color.borderSubtle}`,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
              >
                <div style={{ fontSize: 11, color: color.secondaryText, marginBottom: 4 }}>
                  {n.date?.slice(0, 10)}
                </div>
                {n.lesson && (
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>
                    <strong>教訓:</strong> {n.lesson}
                  </p>
                )}
                {n.mistake && (
                  <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: color.secondaryText, marginTop: 3 }}>
                    {n.mistake}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 出席會議 */}
      {data && data.meetings && data.meetings.length > 0 && (
        <Card padded style={{ marginBottom: spacing.lg }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            🏛️ 主持/出席會議
          </h3>
          <div style={{ display: "grid", gap: 4 }}>
            {data.meetings.map((m) => (
              <Link
                key={m.meeting_id}
                href={`/meetings`}
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  border: `1px solid ${color.borderSubtle}`,
                  borderRadius: 4,
                  textDecoration: "none",
                  color: color.primaryText,
                  display: "block",
                }}
              >
                {m.meeting_type} · {m.scheduled_at?.slice(0, 16).replace("T", " ")}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* 辯論記錄(尚無資料) */}
      <Card padded style={{ marginBottom: spacing.lg }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
          ⚔️ 辯論記錄
        </h3>
        <EmptyState
          title="尚無辯論紀錄"
          description="戰情室會議系統(008e)上線後,所有質疑與回應會留檔在這裡。"
        />
      </Card>

      <div style={{ marginTop: spacing.xl, textAlign: "center" }}>
        <Link href="/agents" style={{ color: color.accent, textDecoration: "underline" }}>
          ← 回名冊
        </Link>
      </div>
    </main>
  );
}
