"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MyLeavePromotionItem } from "@teamlet/modules/leave";
import { submitLeavePlanAction } from "@/lib/actions/leave-promotion";

const TYPE_LABEL: Record<string, string> = {
  ANNUAL: "연차",
  MONTHLY_1ST: "월차 1차",
  MONTHLY_2ND: "월차 2차",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "작성 요청됨",
  ADMIN_WRITING: "관리자 작성 기간",
  APPROVAL_PENDING: "승인 진행 중",
  REJECTED: "반려",
  COMPLETED: "완료",
  EXPIRED: "작성 기간 지남",
  CANCELLED: "촉진 취소",
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

function fmtFullDate(d: Date) {
  const dt = new Date(d);
  const w = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()} (${w})`;
}

export function AnnualPlanTab({
  promotions,
  year,
  currentYear,
}: {
  promotions: MyLeavePromotionItem[];
  year: number;
  currentYear: number;
}) {
  return (
    <div>
      {/* 조회 기간 (연도 네비) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 16 }}>
        <Link href={`/leave?tab=plan&year=${year - 1}`} className="btn btn-ghost sm">‹</Link>
        <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>📅 조회 기간 {year}년</span>
        <Link href={`/leave?tab=plan&year=${year + 1}`} className="btn btn-ghost sm">›</Link>
      </div>

      {promotions.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 14, color: "var(--fg-muted)" }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>🗓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>연차 촉진 내역이 없어요.</div>
          <div style={{ fontSize: 12.5 }}>담당자가 연차 촉진을 시작하면 이 곳에서 연차 사용 계획을 작성할 수 있어요.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {promotions.map((p) => (
            <PromotionCard key={p.id} promotion={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromotionCard({ promotion: p }: { promotion: MyLeavePromotionItem }) {
  const router = useRouter();
  const [dates, setDates] = useState<string[]>(p.planDates.map((d) => new Date(d).toISOString().slice(0, 10)));
  const [newDate, setNewDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addDate() {
    if (!newDate) return;
    if (dates.includes(newDate)) { setNewDate(""); return; }
    setDates((d) => [...d, newDate].sort());
    setNewDate("");
  }
  function removeDate(d: string) {
    setDates((arr) => arr.filter((x) => x !== d));
  }

  function handleSubmit() {
    setError(null);
    if (dates.length === 0) { setError("사용 희망일을 1개 이상 선택해 주세요."); return; }
    startTransition(async () => {
      const res = await submitLeavePlanAction(p.id, dates);
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", background: "var(--bg-primary)" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-secondary)", fontWeight: 600 }}>
            {TYPE_LABEL[p.promotionType] ?? p.promotionType}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>연차 사용 계획</span>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: STATUS_COLOR[p.status] ?? "var(--fg)" }}>
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      </div>

      {/* 요약 */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16, fontSize: 13 }}>
        <div>
          <span style={{ color: "var(--fg-muted)" }}>계획 대상 연차 </span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{p.targetDays}일</b>
        </div>
        <div>
          <span style={{ color: "var(--fg-muted)" }}>법정 소멸일 </span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtFullDate(p.expiryDate)}</b>
        </div>
      </div>

      {p.canSubmit ? (
        <>
          {/* 사용 희망일 선택 */}
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>
            연차 사용 희망일 <span style={{ color: "var(--fg-subtle)", fontWeight: 400 }}>· 총 {dates.length}일</span>
          </div>
          {dates.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {dates.map((d) => (
                <span key={d} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, fontSize: 12.5, border: "1.5px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {fmtFullDate(new Date(d))}
                  <button type="button" onClick={() => removeDate(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              style={{ flex: 1, padding: "9px 11px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--bg-primary)", color: "var(--fg)", outline: "none" }} />
            <button type="button" onClick={addDate} disabled={!newDate}
              style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--fg)", cursor: newDate ? "pointer" : "default" }}>
              희망일 추가
            </button>
          </div>

          {error && <p style={{ fontSize: 12.5, color: "var(--destructive)", margin: "0 0 10px" }}>{error}</p>}

          <button type="button" onClick={handleSubmit} disabled={isPending}
            style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14.5, fontWeight: 700, background: isPending ? "var(--bg-tertiary)" : "var(--primary)", color: isPending ? "var(--fg-muted)" : "white", border: "none", cursor: isPending ? "wait" : "pointer" }}>
            {isPending ? "제출 중…" : "사용 계획 제출하기"}
          </button>
          <p style={{ fontSize: 11.5, color: "var(--fg-subtle)", textAlign: "center", marginTop: 8 }}>
            제출하면 담당자에게 승인을 요청해요. 근로기준법 제61조에 따른 사용 시기 지정·통보로 기록돼요.
          </p>
        </>
      ) : (
        /* 제출 완료 — 희망일 표시 */
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>
            연차 사용 희망일 <span style={{ color: "var(--fg-subtle)", fontWeight: 400 }}>· 총 {p.planDates.length}일</span>
          </div>
          {p.planDates.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.planDates.map((d, i) => (
                <span key={i} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12.5, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {fmtFullDate(d)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--fg-subtle)" }}>제출된 희망일이 없어요.</div>
          )}
          {p.formDocumentId && (
            <div style={{ marginTop: 12 }}>
              <Link href={`/workflow/documents/${p.formDocumentId}`} className="btn btn-ghost sm">결재 문서 보기 →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
