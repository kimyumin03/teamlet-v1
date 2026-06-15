"use client";

import { useState } from "react";
import Link from "next/link";
import type { DocumentListItem, FormDocumentKind } from "@teamlet/modules/workflow";

const KIND_LABEL: Record<FormDocumentKind, string> = {
  GENERAL: "일반", LEAVE_REQUEST: "휴가 신청", LEAVE_PLAN: "연차 사용 계획", INFO_CHANGE: "정보변경", ANNOUNCEMENT: "공지",
};
const KIND_CSS: Record<FormDocumentKind, string> = {
  GENERAL: "", LEAVE_REQUEST: "leave", LEAVE_PLAN: "leave", INFO_CHANGE: "hr", ANNOUNCEMENT: "",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function StepLine({ current, total, rejected = false }: { current: number; total: number; rejected?: boolean }) {
  const steps = [
    { label: "신청", state: "done" as const },
    ...Array.from({ length: total }, (_, i) => {
      const step = i + 1;
      return {
        label: `${step}단계`,
        state: (rejected && step === current ? "rej" : step <= current ? "done" : "pending") as "done" | "rej" | "pending",
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

export function DoneTabClient({ docs }: { docs: DocumentListItem[] }) {
  const [kindFilter, setKindFilter] = useState<FormDocumentKind | "">("");
  const [statusFilter, setStatusFilter] = useState<"" | "APPROVED" | "REJECTED" | "CANCELLED">("");

  const allKinds = Array.from(new Set(docs.map((d) => d.kind)));

  const filtered = docs.filter((d) => {
    if (kindFilter && d.kind !== kindFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  if (docs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--fg-muted)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>완료된 문서가 없어요</div>
        <div style={{ fontSize: 12.5 }}>승인 또는 반려된 문서가 여기에 표시돼요.</div>
      </div>
    );
  }

  const approvedCount = docs.filter((d) => d.status === "APPROVED").length;
  const rejectedCount = docs.filter((d) => d.status === "REJECTED").length;

  return (
    <div>
      {/* 필터 바 */}
      <div className="filters" style={{ marginBottom: 14 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{
            height: 32, padding: "0 28px 0 12px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            fontSize: 12.5, color: statusFilter ? "var(--fg)" : "var(--fg-muted)",
            cursor: "pointer", fontFamily: "inherit", appearance: "none",
          }}
        >
          <option value="">처리 결과 · 전체</option>
          <option value="APPROVED">승인 ({approvedCount})</option>
          <option value="REJECTED">반려 ({rejectedCount})</option>
          <option value="CANCELLED">취소</option>
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as FormDocumentKind | "")}
          style={{
            height: 32, padding: "0 28px 0 12px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--bg-primary)",
            fontSize: 12.5, color: kindFilter ? "var(--fg)" : "var(--fg-muted)",
            cursor: "pointer", fontFamily: "inherit", appearance: "none",
          }}
        >
          <option value="">종류 · 전체</option>
          {allKinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
          {filtered.length}건
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>
          조건에 맞는 문서가 없어요.
        </div>
      ) : (
        filtered.map((doc) => {
          const rejected = doc.status === "REJECTED";
          const stepCurrent = rejected ? (doc.currentStep ?? doc.totalSteps) : doc.totalSteps + 1;
          return (
            <Link key={doc.id} href={`/workflow/documents/${doc.id}`} className="doc">
              <div className="doc-kind">
                <span className={`k ${KIND_CSS[doc.kind]}`}>{KIND_LABEL[doc.kind]}</span>
                <span className="d">{formatDate(doc.createdAt)}</span>
              </div>
              <div className="doc-body">
                <div className="t">{doc.title}</div>
                <div className="m">총 {doc.totalSteps}단계 · {formatDate(doc.createdAt)} 기안</div>
              </div>
              <StepLine current={stepCurrent} total={doc.totalSteps} rejected={rejected} />
              <div className="doc-actions">
                <span className={`doc-due${doc.status === "APPROVED" ? " ok" : doc.status === "REJECTED" ? " rej" : ""}`}>
                  {doc.status === "APPROVED" ? "승인" : doc.status === "REJECTED" ? "반려" : "취소"}
                </span>
                <span className="open-arr">→</span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
