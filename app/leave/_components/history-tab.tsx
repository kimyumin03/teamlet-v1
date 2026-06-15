"use client";

import { useState } from "react";
import type { LeaveRequestItem } from "@teamlet/modules/leave";
import { CancelLeaveButton } from "@/components/leave/cancel-leave-button";

const STATUS_LABEL: Record<LeaveRequestItem["status"], string> = {
  DRAFT: "임시저장",
  PENDING: "대기 중",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소",
  CANCEL_PENDING: "취소 대기",
};
const STATUS_CLS: Record<LeaveRequestItem["status"], string> = {
  DRAFT: "border-border bg-background-secondary text-foreground-subtle",
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  REJECTED: "border-destructive bg-destructive-50 text-destructive",
  CANCELLED: "border-border bg-background-secondary text-foreground-subtle",
  CANCEL_PENDING: "border-amber-300 bg-amber-50 text-amber-700",
};

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "PENDING", label: "대기 중" },
  { id: "APPROVED", label: "승인" },
  { id: "REJECTED", label: "반려" },
  { id: "CANCELLED", label: "취소" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
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

function ScheduleDetail({ schedule }: { schedule: { date: string; unit: string }[] }) {
  if (schedule.length === 0) return null;
  // 3일 이하는 펼쳐 표시, 4일 이상은 첫 2일 + "외 N일"
  const MAX_SHOW = 3;
  const shown = schedule.slice(0, MAX_SHOW);
  const rest = schedule.length - MAX_SHOW;
  return (
    <p className="mt-0.5 text-[11.5px] text-foreground-subtle">
      {shown.map((e) => `${fmtMD(e.date)} ${UNIT_LABEL[e.unit] ?? e.unit}`).join(" · ")}
      {rest > 0 && ` 외 ${rest}일`}
    </p>
  );
}

export function HistoryTab({ requests }: { requests: LeaveRequestItem[] }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const counts: Record<string, number> = {};
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <div>
      {/* 필터 */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? requests.length : (counts[f.id] ?? 0);
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 border-b-2 -mb-px px-4 py-2 text-sm transition-colors ${
                filter === f.id
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background-secondary px-1 text-[10px] font-semibold text-foreground-subtle">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-[14px] font-medium text-foreground">내역이 없어요</p>
          <p className="text-[12.5px] text-foreground-muted">
            {filter === "all" ? "신청한 휴가가 없어요" : `${STATUS_LABEL[filter as LeaveRequestItem["status"]] ?? filter} 내역이 없어요`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-background-primary px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13.5px] font-semibold text-foreground">{r.leaveTypeName}</span>
                  <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground">{r.days}일</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-foreground-muted">
                  <span>{fmtDate(r.startDate)}</span>
                  {r.startDate.toString() !== r.endDate.toString() && (
                    <>
                      <span className="text-foreground-subtle">–</span>
                      <span>{fmtDate(r.endDate)}</span>
                    </>
                  )}
                  {r.reason && <span className="text-foreground-subtle truncate">· {r.reason}</span>}
                </div>
                <ScheduleDetail schedule={r.schedule} />
                {r.reviewNote && (
                  <p className="mt-1 text-[11.5px] text-foreground-subtle">메모: {r.reviewNote}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-semibold ${STATUS_CLS[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                {r.status === "PENDING" && <CancelLeaveButton requestId={r.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
