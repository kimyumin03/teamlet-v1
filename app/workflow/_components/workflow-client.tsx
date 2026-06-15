"use client";

import { useState } from "react";
import Link from "next/link";
import type { DocumentListItem, PendingApprovalItem, CcDocumentItem, FormDocumentKind, FormTemplateItem } from "@teamlet/modules/workflow";
import type { EmployeeListItem } from "@teamlet/modules/employee";
import { ApproveDocumentButtons } from "@/components/workflow/approve-document-buttons";
import { CreateDocumentButton } from "@/components/workflow/create-document-button";

const KIND_LABEL: Record<FormDocumentKind, string> = {
  GENERAL: "일반", LEAVE_REQUEST: "휴가 신청", LEAVE_PLAN: "연차 사용 계획", INFO_CHANGE: "정보변경", ANNOUNCEMENT: "공지",
};
const KIND_CSS: Record<FormDocumentKind, string> = {
  GENERAL: "", LEAVE_REQUEST: "leave", LEAVE_PLAN: "leave", INFO_CHANGE: "hr", ANNOUNCEMENT: "",
};
const STATUS_KO: Record<string, string> = {
  DRAFT: "임시저장", IN_PROGRESS: "진행 중", APPROVED: "승인", REJECTED: "반려", CANCELLED: "취소",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}
function daysSince(d: Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function StepLine({ current, total, rejected = false }: { current: number; total: number; rejected?: boolean }) {
  const steps = [
    { label: "신청", state: "done" as const },
    ...Array.from({ length: total }, (_, i) => {
      const s = i + 1;
      return { label: `${s}단계`, state: (rejected && s === current ? "rej" : s < current ? "done" : s === current ? "now" : "pending") as "done"|"now"|"rej"|"pending" };
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

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="sec-divider">
      <span>{label}</span><span className="ct">{count}</span><span className="line" />
    </div>
  );
}

function EmptyState({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--fg-muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, marginBottom: action ? 20 : 0 }}>{sub}</div>
      {action}
    </div>
  );
}

type BoxId = "mine" | "company";
type StatusId = "active" | "done" | "all";
type EmpItem = Pick<EmployeeListItem, "id" | "name" | "departmentName">;

export function WorkflowClient({
  pending,
  myDocs,
  ccDocs,
  employees,
  templates,
  initialBox,
  initialStatus,
}: {
  pending: PendingApprovalItem[];
  myDocs: DocumentListItem[];
  ccDocs: CcDocumentItem[];
  employees: EmpItem[];
  templates: FormTemplateItem[];
  initialBox: BoxId;
  initialStatus: StatusId;
}) {
  const [box, setBox] = useState<BoxId>(initialBox);
  const [status, setStatus] = useState<StatusId>(initialStatus);
  const [kindFilter, setKindFilter] = useState<FormDocumentKind | "">("");

  const inProgressDocs = myDocs.filter((d) => d.status === "IN_PROGRESS");
  const draftDocs = myDocs.filter((d) => d.status === "DRAFT");
  const completedDocs = myDocs.filter((d) => ["APPROVED","REJECTED","CANCELLED"].includes(d.status));
  const urgentPending = pending.filter((p) => daysSince(p.createdAt) >= 3);

  // "내 문서함" = 내가 결재해야 할 것 + 내가 기안한 것 + 참조
  // active = 진행중 (결재대기 + 진행중인 내 문서)
  // done = 완료 (승인/반려 + 참조)
  // all = 전체

  const allKinds = Array.from(new Set([
    ...pending.map(p => p.documentKind),
    ...myDocs.map(d => d.kind),
  ]));

  const SUB_TABS = [
    { id: "active" as StatusId, label: "진행중", count: pending.length + inProgressDocs.length + draftDocs.length },
    { id: "done" as StatusId, label: "완료", count: completedDocs.length + ccDocs.length },
    { id: "all" as StatusId, label: "전체", count: pending.length + myDocs.length + ccDocs.length },
  ];

  return (
    <div>
      {/* 박스 전환 — 내 문서함 / 회사 문서함 */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 0, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["mine", "company"] as BoxId[]).map((b) => (
          <button
            key={b}
            onClick={() => setBox(b)}
            style={{
              fontSize: 15, fontWeight: box === b ? 700 : 400,
              color: box === b ? "var(--fg)" : "var(--fg-muted)",
              background: "none", border: "none", cursor: "pointer",
              paddingBottom: 10, borderBottom: `2px solid ${box === b ? "var(--fg)" : "transparent"}`,
              fontFamily: "inherit", transition: "color 120ms",
            }}
          >
            {b === "mine" ? "내 문서함" : "회사 문서함"}
          </button>
        ))}
      </div>

      {/* 서브탭 (진행중/완료/전체) — 디자인 .wf-tabs */}
      <div className="wf-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`wf-tab${status === t.id ? " active" : ""}`}
          >
            {t.label}
            {t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* 필터 바 */}
      <div className="filters" style={{ marginTop: 14, marginBottom: 14 }}>
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
          <option value="">양식 · 전체</option>
          {allKinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        {box === "mine" && status === "active" && urgentPending.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--destructive)", fontWeight: 600 }}>
            마감 임박 {urgentPending.length}건
          </span>
        )}
      </div>

      {/* 목록 */}
      {box === "mine" && <MineView status={status} pending={pending} inProgressDocs={inProgressDocs} draftDocs={draftDocs} completedDocs={completedDocs} ccDocs={ccDocs} kindFilter={kindFilter} employees={employees} templates={templates} />}
      {box === "company" && (
        <EmptyState icon="🏢" title="회사 전체 문서함" sub="HR 관리자 권한이 있으면 전체 결재 현황을 볼 수 있어요." />
      )}
    </div>
  );
}

function MineView({
  status, pending, inProgressDocs, draftDocs, completedDocs, ccDocs, kindFilter, employees, templates,
}: {
  status: StatusId;
  pending: PendingApprovalItem[];
  inProgressDocs: DocumentListItem[];
  draftDocs: DocumentListItem[];
  completedDocs: DocumentListItem[];
  ccDocs: CcDocumentItem[];
  kindFilter: FormDocumentKind | "";
  employees: Pick<EmployeeListItem, "id"|"name"|"departmentName">[];
  templates: FormTemplateItem[];
}) {
  const fPending = kindFilter ? pending.filter((p) => p.documentKind === kindFilter) : pending;
  const fInProgress = kindFilter ? inProgressDocs.filter((d) => d.kind === kindFilter) : inProgressDocs;
  const fDraft = kindFilter ? draftDocs.filter((d) => d.kind === kindFilter) : draftDocs;
  const fCompleted = kindFilter ? completedDocs.filter((d) => d.kind === kindFilter) : completedDocs;
  const urgentPending = fPending.filter((p) => Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) >= 3);
  const normalPending = fPending.filter((p) => Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) < 3);

  if (status === "active") {
    const total = fPending.length + fInProgress.length + fDraft.length;
    if (total === 0) return <EmptyState icon="✓" title="진행 중인 문서가 없어요" sub="모든 결재를 처리했어요." action={<CreateDocumentButton employees={employees} templates={templates} />} />;
    return (
      <div>
        {fPending.length > 0 && (
          <>
            {urgentPending.length > 0 && (
              <>
                <SectionDivider label="마감 임박" count={urgentPending.length} />
                {urgentPending.map((item) => <PendingCard key={item.id} item={item} urgent />)}
              </>
            )}
            {normalPending.length > 0 && (
              <>
                <SectionDivider label="결재 대기" count={normalPending.length} />
                {normalPending.map((item) => <PendingCard key={item.id} item={item} urgent={false} />)}
              </>
            )}
          </>
        )}
        {fInProgress.length > 0 && (
          <>
            <SectionDivider label="내가 기안한 — 진행 중" count={fInProgress.length} />
            {fInProgress.map((doc) => <MyDocCard key={doc.id} doc={doc} />)}
          </>
        )}
        {fDraft.length > 0 && (
          <>
            <SectionDivider label="임시저장" count={fDraft.length} />
            {fDraft.map((doc) => <MyDocCard key={doc.id} doc={doc} />)}
          </>
        )}
      </div>
    );
  }

  if (status === "done") {
    const total = fCompleted.length + ccDocs.length;
    if (total === 0) return <EmptyState icon="📋" title="완료된 문서가 없어요" sub="승인 또는 반려된 문서와 참조 문서가 여기에 표시돼요." />;
    return (
      <div>
        {fCompleted.length > 0 && (
          <>
            <SectionDivider label="완료" count={fCompleted.length} />
            {fCompleted.map((doc) => {
              const rejected = doc.status === "REJECTED";
              const stepCurrent = rejected ? (doc.currentStep ?? doc.totalSteps) : doc.totalSteps + 1;
              return (
                <Link key={doc.id} href={`/workflow/documents/${doc.id}`} className="doc">
                  <div className="doc-kind"><span className={`k ${KIND_CSS[doc.kind]}`}>{KIND_LABEL[doc.kind]}</span><span className="d">{fmt(doc.createdAt)}</span></div>
                  <div className="doc-body"><div className="t">{doc.title}</div><div className="m">총 {doc.totalSteps}단계</div></div>
                  <StepLine current={stepCurrent} total={doc.totalSteps} rejected={rejected} />
                  <div className="doc-actions">
                    <span className={`doc-due${doc.status==="APPROVED"?" ok":doc.status==="REJECTED"?" rej":""}`}>{STATUS_KO[doc.status]}</span>
                    <span className="open-arr">→</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
        {ccDocs.length > 0 && (
          <>
            <SectionDivider label="참조" count={ccDocs.length} />
            {ccDocs.map((doc) => (
              <Link key={doc.id} href={`/workflow/documents/${doc.id}`} className="doc">
                <div className="doc-kind"><span className="k">{KIND_LABEL[doc.kind as FormDocumentKind] ?? doc.kind}</span><span className="d">{fmt(doc.createdAt)}</span></div>
                <div className="doc-body"><div className="t">{doc.title}</div><div className="m"><span className="who"><span className="av-mini">{doc.authorName.slice(-2)}</span><b>{doc.authorName}</b></span><span className="sep">·</span><span>참조</span></div></div>
                <span />
                <div className="doc-actions"><span className={`doc-due${doc.status==="APPROVED"?" ok":doc.status==="REJECTED"?" rej":" soon"}`}>{STATUS_KO[doc.status]}</span><span className="open-arr">→</span></div>
              </Link>
            ))}
          </>
        )}
      </div>
    );
  }

  // 전체
  const all = [...fPending.map(p=>({id:p.documentId,title:p.documentTitle,kind:p.documentKind,status:"IN_PROGRESS",createdAt:p.createdAt,type:"pending" as const,item:p})),
    ...fInProgress.map(d=>({id:d.id,title:d.title,kind:d.kind,status:d.status,createdAt:d.createdAt,type:"mine" as const,item:d})),
    ...fDraft.map(d=>({id:d.id,title:d.title,kind:d.kind,status:d.status,createdAt:d.createdAt,type:"mine" as const,item:d})),
    ...fCompleted.map(d=>({id:d.id,title:d.title,kind:d.kind,status:d.status,createdAt:d.createdAt,type:"mine" as const,item:d})),
  ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());

  if (all.length === 0) return <EmptyState icon="📝" title="문서가 없어요" sub="결재 문서를 작성해보세요." action={<CreateDocumentButton employees={employees} templates={templates} />} />;

  return (
    <div>
      {all.map((entry) => {
        if (entry.type === "pending") {
          const p = entry.item as PendingApprovalItem;
          return <PendingCard key={`p-${p.id}`} item={p} urgent={Math.floor((Date.now()-new Date(p.createdAt).getTime())/86400000)>=3} />;
        }
        return <MyDocCard key={entry.id} doc={entry.item as DocumentListItem} />;
      })}
    </div>
  );
}

function PendingCard({ item, urgent }: { item: PendingApprovalItem; urgent: boolean }) {
  const days = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000);
  return (
    <div className={`doc${urgent ? " urg" : ""}`}>
      <div className="doc-kind"><span className={`k ${KIND_CSS[item.documentKind]}`}>{KIND_LABEL[item.documentKind]}</span><span className="d">{fmt(item.createdAt)} 신청</span></div>
      <div className="doc-body">
        <div className="t">{item.documentTitle}</div>
        <div className="m"><span className="who"><span className="av-mini">{item.authorName.slice(-2)}</span><b>{item.authorName}</b></span><span className="sep">·</span><span>{item.step}/{item.totalSteps}단계</span></div>
      </div>
      <StepLine current={item.step} total={item.totalSteps} />
      <div className="doc-actions">
        {days === 0 ? <span className="doc-due">오늘</span> : days >= 3 ? <span className="doc-due urg">D+{days}</span> : <span className="doc-due soon">D+{days}</span>}
        <Link href={`/workflow/documents/${item.documentId}`} className="btn btn-outline sm">상세</Link>
        <ApproveDocumentButtons lineId={item.id} />
      </div>
    </div>
  );
}

function MyDocCard({ doc }: { doc: DocumentListItem }) {
  const current = doc.currentStep ?? 0;
  const rejected = doc.status === "REJECTED";
  const stepCurrent = rejected ? (doc.currentStep ?? doc.totalSteps) : doc.totalSteps + 1;
  const isDone = ["APPROVED","REJECTED","CANCELLED"].includes(doc.status);
  return (
    <Link href={`/workflow/documents/${doc.id}`} className="doc">
      <div className="doc-kind"><span className={`k ${KIND_CSS[doc.kind]}`}>{KIND_LABEL[doc.kind]}</span><span className="d">{fmt(doc.createdAt)}</span></div>
      <div className="doc-body">
        <div className="t">{doc.title}</div>
        <div className="m">{doc.status==="DRAFT" ? "임시저장됨" : current>0 ? `${current}/${doc.totalSteps}단계 결재 중` : `총 ${doc.totalSteps}단계`}</div>
      </div>
      {isDone ? <StepLine current={stepCurrent} total={doc.totalSteps} rejected={rejected} /> : (current>0 ? <StepLine current={current} total={doc.totalSteps} /> : <span />)}
      <div className="doc-actions">
        <span className={`doc-due${doc.status==="APPROVED"?" ok":doc.status==="REJECTED"?" rej":doc.status==="IN_PROGRESS"?" soon":""}`}>{STATUS_KO[doc.status]}</span>
        <span className="open-arr">→</span>
      </div>
    </Link>
  );
}
