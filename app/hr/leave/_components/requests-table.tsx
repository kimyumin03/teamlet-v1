"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompanyLeaveRequestItem } from "@teamlet/modules/leave";
import { approveLeaveAction, rejectLeaveAction } from "@/lib/actions/leave";

const STATUS_LABEL: Record<CompanyLeaveRequestItem["status"], string> = {
  DRAFT: "임시저장",
  PENDING: "대기 중",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소",
  CANCEL_PENDING: "취소 대기",
};
const STATUS_CLASS: Record<CompanyLeaveRequestItem["status"], string> = {
  DRAFT: "bg-background-secondary text-foreground-subtle",
  PENDING: "bg-warning-50 text-warning-700",
  APPROVED: "bg-success-50 text-success-700",
  REJECTED: "bg-destructive-50 text-destructive-700",
  CANCELLED: "bg-background-secondary text-foreground-subtle",
  CANCEL_PENDING: "bg-warning-50 text-warning-700",
};

const FILTER_TABS = [
  { id: "ALL", label: "전체" },
  { id: "PENDING", label: "대기" },
  { id: "APPROVED", label: "승인" },
  { id: "REJECTED", label: "반려" },
  { id: "CANCELLED", label: "취소" },
] as const;
type FilterId = (typeof FILTER_TABS)[number]["id"];

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function fmtMD(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const UNIT_LABEL: Record<string, string> = {
  FULL: "종일",
  AM_HALF: "오전반차",
  PM_HALF: "오후반차",
  HOURLY: "시간차",
};

function ScheduleCell({ schedule }: { schedule: { date: string; unit: string }[] }) {
  if (schedule.length === 0) return null;
  const MAX_SHOW = 2;
  const shown = schedule.slice(0, MAX_SHOW);
  const rest = schedule.length - MAX_SHOW;
  return (
    <p className="mt-0.5 text-[11px] text-foreground-subtle whitespace-nowrap">
      {shown.map((e) => `${fmtMD(e.date)} ${UNIT_LABEL[e.unit] ?? e.unit}`).join(" · ")}
      {rest > 0 && ` 외 ${rest}일`}
    </p>
  );
}

function ActionCell({ request }: { request: CompanyLeaveRequestItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // FormDocument 경유 신청 → 워크플로우 결재함에서 처리
  if (request.formDocumentId) {
    return (
      <Link
        href={`/workflow/documents/${request.formDocumentId}`}
        className="rounded-md px-2.5 py-1 text-xs font-medium border border-border text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors whitespace-nowrap"
      >
        결재함 →
      </Link>
    );
  }

  // 직접 승인/반려 (formDocument 없는 구형)
  if (request.status !== "PENDING") return null;

  function handleApprove() {
    startTransition(async () => {
      const res = await approveLeaveAction(request.id);
      if (!res.ok) alert(res.error.message);
      else router.refresh();
    });
  }

  function handleReject() {
    const note = prompt("반려 사유 (선택):");
    if (note === null) return;
    startTransition(async () => {
      const res = await rejectLeaveAction(request.id, note || undefined);
      if (!res.ok) alert(res.error.message);
      else router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      <button onClick={handleApprove} disabled={isPending}
        className="rounded-md border border-success-100 bg-success-50 px-2.5 py-[3px] text-xs font-semibold text-success-700 disabled:opacity-50">
        승인
      </button>
      <button onClick={handleReject} disabled={isPending}
        className="rounded-md border border-destructive-100 bg-destructive-50 px-2.5 py-[3px] text-xs font-semibold text-destructive-600 disabled:opacity-50">
        반려
      </button>
    </div>
  );
}

export function RequestsTable({ requests }: { requests: CompanyLeaveRequestItem[] }) {
  const [filter, setFilter] = useState<FilterId>("PENDING");
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
  const countFor = (id: FilterId) =>
    id === "ALL" ? requests.length : requests.filter((r) => r.status === id).length;

  return (
    <div>
      {pendingCount > 0 && (
        <div className="mb-3.5 rounded-[10px] border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[13px] text-foreground">
          승인 대기 <strong>{pendingCount}건</strong> — 결재함 경유 신청은 "결재함 →" 버튼으로 이동해 처리해 주세요.
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-border">
        {FILTER_TABS.map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-1.5 border-b-2 -mb-px px-3 py-2 text-sm transition-colors ${
              filter === tab.id ? "border-foreground text-foreground font-medium" : "border-transparent text-foreground-muted hover:text-foreground"
            }`}>
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
              filter === tab.id ? "bg-foreground text-background-primary" : "bg-background-secondary text-foreground-subtle"
            }`}>{countFor(tab.id)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-foreground-subtle">해당하는 신청이 없어요</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">부서</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">휴가 종류</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">기간</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground-muted">일수</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">사유</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted">상태</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground-muted">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-background-secondary/50 transition-colors ${r.status === "PENDING" ? "bg-warning-50/40" : ""}`}>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.employeeName}</td>
                  <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{r.departmentName ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{r.leaveTypeName}</td>
                  <td className="px-4 py-3 text-foreground-muted whitespace-nowrap tabular-nums">
                    <span>{fmtDate(r.startDate)}{r.startDate.toString() !== r.endDate.toString() && ` – ${fmtDate(r.endDate)}`}</span>
                    <ScheduleCell schedule={r.schedule} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{r.days}일</td>
                  <td className="px-4 py-3 text-foreground-muted max-w-[180px] truncate">{r.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right"><ActionCell request={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
