"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@teamlet/ui";
import type { LeavePromotionItem, LeavePromotionDetail } from "@teamlet/modules/leave";
import { cancelLeavePromotionAction, getLeavePromotionDetailAction } from "@/lib/actions/leave-promotion";

const TYPE_LABEL: Record<string, string> = {
  ANNUAL: "연차",
  MONTHLY_1ST: "월차 1차",
  MONTHLY_2ND: "월차 2차",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "작성요청됨",
  ADMIN_WRITING: "관리자작성기간",
  APPROVAL_PENDING: "승인진행중",
  REJECTED: "반려",
  COMPLETED: "완료",
  EXPIRED: "작성기간지남",
  CANCELLED: "촉진취소",
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "#2563eb",
  ADMIN_WRITING: "#7c3aed",
  APPROVAL_PENDING: "#d97706",
  REJECTED: "var(--destructive)",
  COMPLETED: "#16a34a",
  EXPIRED: "var(--fg-muted)",
  CANCELLED: "var(--fg-subtle)",
};

function fmtDate(d: Date) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

const ACTIVE_STATUSES = new Set(["REQUESTED", "ADMIN_WRITING", "APPROVAL_PENDING", "REJECTED"]);
const DONE_STATUSES = new Set(["COMPLETED", "EXPIRED", "CANCELLED"]);

export function PromotionTable({ promotions }: { promotions: LeavePromotionItem[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [, startTransition] = useTransition();
  const [detail, setDetail] = useState<LeavePromotionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  function openDetail(promotionId: string) {
    setDetailLoading(promotionId);
    startTransition(async () => {
      const res = await getLeavePromotionDetailAction(promotionId);
      setDetailLoading(null);
      if (res.ok) setDetail(res.data);
    });
  }

  const filtered = promotions.filter((p) => {
    if (filter === "active") return ACTIVE_STATUSES.has(p.status);
    if (filter === "done") return DONE_STATUSES.has(p.status);
    return true;
  });

  function handleCancel(id: string) {
    if (!confirm("촉진을 취소할까요?")) return;
    startTransition(async () => {
      await cancelLeavePromotionAction(id);
    });
  }

  if (promotions.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "14px", color: "var(--fg-muted)" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--fg)", marginBottom: "6px" }}>연차 촉진 내역이 없어요</div>
        <div style={{ fontSize: "12.5px" }}>연차 촉진 설정에서 스마트 촉진을 사용하면 자동으로 생성돼요</div>
      </div>
    );
  }

  return (
    <div>
      {/* 필터 탭 */}
      <div className="tabs" style={{ marginBottom: "16px" }}>
        {(["all", "active", "done"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`tab${filter === f ? " active" : ""}`}>
            {f === "all" ? "전체" : f === "active" ? "진행 중" : "종료"}
            <span style={{ marginLeft: "4px", fontSize: "11px", fontVariantNumeric: "tabular-nums",
              color: filter === f ? "var(--primary)" : "var(--fg-muted)" }}>
              {f === "all" ? promotions.length : f === "active"
                ? promotions.filter((p) => ACTIVE_STATUSES.has(p.status)).length
                : promotions.filter((p) => DONE_STATUSES.has(p.status)).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={TH}>재직상태</th>
              <th style={TH}>이름</th>
              <th style={TH}>사번</th>
              <th style={TH}>촉진 유형</th>
              <th style={TH}>소멸일</th>
              <th style={TH}>진행 상태</th>
              <th style={TH}>사용 계획</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={TD}>
                  <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "99px", border: "1px solid var(--border)",
                    color: p.employmentStatus === "ACTIVE" ? "#16a34a" : "var(--fg-muted)" }}>
                    {p.employmentStatus === "ACTIVE" ? "재직" : p.employmentStatus === "ON_LEAVE" ? "휴직" : p.employmentStatus}
                  </span>
                </td>
                <td style={TD}>{p.employeeName}</td>
                <td style={{ ...TD, color: "var(--fg-muted)" }}>{p.employeeNumber ?? "—"}</td>
                <td style={TD}>
                  <span style={{ fontSize: "11.5px", padding: "2px 7px", borderRadius: "6px", border: "1px solid var(--border)",
                    background: "var(--bg-secondary)", fontWeight: 600 }}>
                    {TYPE_LABEL[p.promotionType] ?? p.promotionType}
                  </span>
                </td>
                <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.expiryDate)}</td>
                <td style={TD}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: STATUS_COLOR[p.status] ?? "var(--fg)" }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td style={TD}>
                  {p.planDates.length > 0 || p.submittedAt ? (
                    <button onClick={() => openDetail(p.id)} disabled={detailLoading === p.id}
                      style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                      {detailLoading === p.id ? "여는 중…" : "보기"}
                    </button>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--fg-subtle)" }}>미제출</span>
                  )}
                </td>
                <td style={TD}>
                  {!DONE_STATUSES.has(p.status) && (
                    <button onClick={() => handleCancel(p.id)}
                      style={{ fontSize: "12px", color: "var(--destructive)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                      취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <Dialog open onOpenChange={(o) => { if (!o) setDetail(null); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden" showClose={false}>
            <PlanDetailPanel detail={detail} onClose={() => setDetail(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ── 연차 사용 계획 상세 패널 (teamlet[28] verbatim) ── */
function PlanDetailPanel({ detail: d, onClose }: { detail: LeavePromotionDetail; onClose: () => void }) {
  function fmtFull(dt: Date) {
    const x = new Date(dt);
    const w = ["일", "월", "화", "수", "목", "금", "토"][x.getDay()];
    return `${x.getFullYear()}. ${x.getMonth() + 1}. ${x.getDate()} (${w})`;
  }
  function fmtDateTime(dt: Date) {
    const x = new Date(dt);
    const ap = x.getHours() < 12 ? "오전" : "오후";
    const h12 = x.getHours() % 12 || 12;
    return `${x.getFullYear()}. ${x.getMonth() + 1}. ${x.getDate()} ${ap} ${h12}:${String(x.getMinutes()).padStart(2, "0")}`;
  }
  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[d.status] ?? "var(--fg)" }}>{STATUS_LABEL[d.status] ?? d.status}</span>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>연차 사용 계획</h3>
        </div>
        <button onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
        {d.submittedAt && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{fmtDateTime(d.submittedAt)} 작성</div>
        )}

        {/* 카드: 계획 정보 */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>📅 연차 사용 계획</div>
          <Row label="이름" value={d.employeeName} />
          <Row label="계획 대상 연차" value={`${d.targetDays}일`} />
          <div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 6 }}>연차 사용 희망일 · 총 {d.planDates.length}일</div>
            {d.planDates.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.planDates.map((pd, i) => (
                  <span key={i} style={{ padding: "4px 9px", borderRadius: 999, fontSize: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>{fmtFull(pd)}</span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>제출된 희망일이 없어요.</span>
            )}
          </div>
        </div>

        {/* 활동 로그 */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>활동 로그</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.activityLog.map((log, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12.5 }}>
                <b>{log.actorName}</b>
                <span style={{ color: "var(--fg-muted)" }}>님이 {log.message}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }}>{fmtFull(log.at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 승인 · 참조 */}
        {d.approval.length > 0 && (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>승인 · 참조</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.approval.map((a) => (
                <div key={a.step} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{a.step}단계 {a.status === "APPROVED" ? "완료" : "대기"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.approverName}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: a.status === "APPROVED" ? "#16a34a" : "var(--fg-muted)" }}>
                    {a.status === "APPROVED" ? "✓ 승인" : a.status === "REJECTED" ? "반려" : "대기"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  textAlign: "left",
  color: "var(--fg-muted)",
  whiteSpace: "nowrap",
  fontSize: "12px",
};

const TD: React.CSSProperties = {
  padding: "10px 12px",
  whiteSpace: "nowrap",
};
