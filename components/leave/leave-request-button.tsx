"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@teamlet/ui";
import type { LeaveTypeItem } from "@teamlet/modules/leave";
import { requestLeaveAction, getHolidayDatesAction } from "@/lib/actions/leave";

type ApproverCandidate = { id: string; name: string };

type HalfDayType = "full" | "morning" | "afternoon";

const HALF_DAY_OPTS: { id: HalfDayType; label: string; days: number }[] = [
  { id: "full", label: "하루 종일", days: 1 },
  { id: "morning", label: "오전 반차", days: 0.5 },
  { id: "afternoon", label: "오후 반차", days: 0.5 },
];

/** 두 날짜 사이 영업일 수 계산 (주말 + 공휴일 제외). */
function calcBusinessDays(start: string, end: string, holidaySet: Set<string>): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function LeaveRequestButton({
  leaveTypes,
  approverCandidates,
}: {
  leaveTypes: LeaveTypeItem[];
  approverCandidates: ApproverCandidate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [approverId, setApproverId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDay, setHalfDay] = useState<HalfDayType>("full");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [holidays, setHolidays] = useState<Set<string>>(new Set());

  // 날짜 변경 시 해당 연도 공휴일 로드
  useEffect(() => {
    const yr = startDate ? parseInt(startDate.slice(0, 4)) : new Date().getFullYear();
    getHolidayDatesAction(yr).then((dates) => setHolidays(new Set(dates)));
  }, [startDate]);

  // 단일 날짜면 종료일 = 시작일로 자동 동기화
  const isSingleDay = startDate === endDate || (halfDay !== "full");

  // 자동 계산 일수
  const autoEndDate = halfDay !== "full" ? startDate : endDate;
  const rawDays = calcBusinessDays(startDate, autoEndDate, holidays);
  const computedDays = halfDay !== "full" ? (rawDays > 0 ? 0.5 : 0) : rawDays;

  function reset() {
    setLeaveTypeId(""); setApproverId(""); setStartDate("");
    setEndDate(""); setHalfDay("full"); setReason(""); setError(null);
  }

  function handleStartChange(v: string) {
    setStartDate(v);
    if (halfDay !== "full") setEndDate(v);
    if (endDate && v > endDate) setEndDate(v);
  }

  function handleHalfDay(h: HalfDayType) {
    setHalfDay(h);
    if (h !== "full" && startDate) setEndDate(startDate);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (computedDays <= 0) { setError("선택한 기간에 휴일이 없어요. 날짜를 다시 확인해 주세요."); return; }
    startTransition(async () => {
      const res = await requestLeaveAction({
        leaveTypeId,
        approverId,
        startDate,
        endDate: halfDay !== "full" ? startDate : endDate,
        days: computedDays,
        reason: reason || undefined,
      });
      if (!res.ok) { setError(res.error.message); return; }
      reset(); setOpen(false); router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o) reset(); setOpen(o); }}>
      <Button onClick={() => setOpen(true)}>+ 휴가 신청</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>휴가 신청</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 휴가 종류 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">휴가 종류</label>
            <select required value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}
              className="h-10 rounded-md border border-border bg-background-primary px-3 text-base text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none">
              <option value="">선택해 주세요</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.grantAmount ? ` (최대 ${t.grantAmount}일)` : ""}</option>
              ))}
            </select>
          </div>

          {/* 사용 단위 (반차) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">사용 단위</label>
            <div style={{ display: "flex", gap: 6 }}>
              {HALF_DAY_OPTS.map((opt) => (
                <button key={opt.id} type="button"
                  onClick={() => handleHalfDay(opt.id)}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${halfDay === opt.id ? "var(--primary)" : "var(--border)"}`,
                    background: halfDay === opt.id ? "var(--primary-soft)" : "var(--bg-primary)",
                    color: halfDay === opt.id ? "var(--primary)" : "var(--fg-muted)",
                    cursor: "pointer",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div className={`grid gap-3 ${halfDay !== "full" ? "" : "grid-cols-2"}`}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground-muted">{halfDay !== "full" ? "날짜" : "시작일"}</label>
              <Input type="date" required min={today} value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
            </div>
            {halfDay === "full" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">종료일</label>
                <Input type="date" required min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          {/* 자동 계산 일수 표시 */}
          {startDate && (halfDay !== "full" ? true : !!endDate) && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: computedDays > 0 ? "var(--primary-soft)" : "var(--destructive-soft, #fee2e2)",
              fontSize: 13,
            }}>
              {computedDays > 0 ? (
                <>사용 예정 <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>{computedDays}일</span>
                  <span style={{ color: "var(--fg-muted)", marginLeft: 8, fontSize: 12 }}>주말·공휴일 제외</span></>
              ) : (
                <span style={{ color: "var(--destructive)" }}>선택 기간 내 사용 가능한 날이 없어요</span>
              )}
            </div>
          )}

          {/* 결재자 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">결재자</label>
            <select required value={approverId} onChange={(e) => setApproverId(e.target.value)}
              className="h-10 rounded-md border border-border bg-background-primary px-3 text-base text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none">
              <option value="">선택해 주세요</option>
              {approverCandidates.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* 사유 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">사유 <span style={{ color: "var(--fg-subtle)" }}>(선택)</span></label>
            <Input maxLength={200} placeholder="예: 개인 사정" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {error && (
            <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>취소</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !leaveTypeId || !approverId || !startDate || (halfDay === "full" && !endDate) || computedDays <= 0}>
              {isPending ? "신청 중…" : "승인 요청하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
