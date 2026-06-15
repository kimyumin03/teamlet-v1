"use client";

import { useState } from "react";
import Link from "next/link";
import type { PendingApprovalItem } from "@teamlet/modules/workflow";
import type { FormDocumentKind } from "@teamlet/modules/workflow";
import { ApproveDocumentButtons } from "@/components/workflow/approve-document-buttons";

const KIND_LABEL: Record<FormDocumentKind, string> = {
  GENERAL: "일반", LEAVE_REQUEST: "휴가 신청", LEAVE_PLAN: "연차 사용 계획", INFO_CHANGE: "정보변경", ANNOUNCEMENT: "공지",
};
const KIND_CSS: Record<FormDocumentKind, string> = {
  GENERAL: "", LEAVE_REQUEST: "leave", LEAVE_PLAN: "leave", INFO_CHANGE: "hr", ANNOUNCEMENT: "",
};

function daysSince(d: Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function StepLine({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: "신청", state: "done" as const },
    ...Array.from({ length: total }, (_, i) => {
      const step = i + 1;
      return {
        label: `${step}단계`,
        state: (step < current ? "done" : step === current ? "now" : "pending") as "done" | "now" | "pending",
      };
    }),
  ];
  return (
    <div className="aline">
      {steps.map((s, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
          {i > 0 && <span className="arr">›</span>}
          <span className={`step ${s.state === "pending" ? "" : s.state}`}>{s.label}</span>
        </span>
      ))}
    </div>
  );
}

function WaitBadge({ createdAt }: { createdAt: Date }) {
  const days = daysSince(createdAt);
  if (days === 0) return <span className="doc-due">오늘</span>;
  if (days >= 3) return <span className="doc-due urg">D+{days}</span>;
  return <span className="doc-due soon">D+{days}</span>;
}

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="sec-divider">
      <span>{label}</span><span className="ct">{count}</span><span className="line" />
    </div>
  );
}

export function PendingTabClient({ pending }: { pending: PendingApprovalItem[] }) {
  const [kindFilter, setKindFilter] = useState<FormDocumentKind | "">("");

  const filtered = kindFilter ? pending.filter(p => p.documentKind === kindFilter) : pending;
  const urgent = filtered.filter(p => daysSince(p.createdAt) >= 3);
  const normal = filtered.filter(p => daysSince(p.createdAt) < 3);

  const allKinds = Array.from(new Set(pending.map(p => p.documentKind)));

  if (pending.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--fg-muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>모두 처리했어요</div>
        <div style={{ fontSize: 12.5 }}>대기 중인 결재 문서가 없어요.</div>
      </div>
    );
  }

  return (
    <div>
      {/* 필터 바 */}
      <div className="filters" style={{ marginBottom: 14 }}>
        <select
          value={kindFilter}
          onChange={e => setKindFilter(e.target.value as FormDocumentKind | "")}
          style={{
            height: 32, padding: "0 28px 0 12px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            fontSize: 12.5, color: kindFilter ? "var(--fg)" : "var(--fg-muted)",
            cursor: "pointer", fontFamily: "inherit", appearance: "none",
          }}
        >
          <option value="">종류 · 전체</option>
          {allKinds.map(k => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
          {filtered.length}건
        </span>
      </div>

      {urgent.length > 0 && (
        <>
          <SectionDivider label="마감 임박" count={urgent.length} />
          {urgent.map(item => <PendingCard key={item.id} item={item} urgent />)}
        </>
      )}
      {normal.length > 0 && (
        <>
          {urgent.length > 0 && <SectionDivider label="결재 대기" count={normal.length} />}
          {normal.map(item => <PendingCard key={item.id} item={item} urgent={false} />)}
        </>
      )}
      {filtered.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>
          선택한 종류의 결재 문서가 없어요.
        </div>
      )}
    </div>
  );
}

function PendingCard({ item, urgent }: { item: PendingApprovalItem; urgent: boolean }) {
  return (
    <div className={`doc${urgent ? " urg" : ""}`}>
      <div className="doc-kind">
        <span className={`k ${KIND_CSS[item.documentKind]}`}>{KIND_LABEL[item.documentKind]}</span>
        <span className="d">{formatDate(item.createdAt)} 신청</span>
      </div>
      <div className="doc-body">
        <div className="t">{item.documentTitle}</div>
        <div className="m">
          <span className="who">
            <span className="av-mini">{item.authorName.slice(-2)}</span>
            <b>{item.authorName}</b>
          </span>
          <span className="sep">·</span>
          <span>{item.step}/{item.totalSteps}단계</span>
        </div>
      </div>
      <StepLine current={item.step} total={item.totalSteps} />
      <div className="doc-actions">
        <WaitBadge createdAt={item.createdAt} />
        <Link href={`/workflow/documents/${item.documentId}`} className="btn btn-outline sm">상세</Link>
        <ApproveDocumentButtons lineId={item.id} />
      </div>
    </div>
  );
}
