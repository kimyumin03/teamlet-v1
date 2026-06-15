"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@teamlet/ui";
import type { EmployeeListItem } from "@teamlet/modules/employee";
import type { LeaveTypeItem } from "@teamlet/modules/leave";
import { grantLeaveAction } from "@/lib/actions/leave";

export function GrantLeaveButton({
  employees,
  leaveTypes,
}: {
  employees: Pick<EmployeeListItem, "id" | "name">[];
  leaveTypes: LeaveTypeItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setEmployeeId("");
    setLeaveTypeId("");
    setDays("");
    setReason("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const daysNum = parseFloat(days);
    if (!daysNum || daysNum <= 0) {
      setError("올바른 일수를 입력해 주세요");
      return;
    }
    startTransition(async () => {
      const res = await grantLeaveAction({
        employeeId,
        leaveTypeId,
        days: daysNum,
        reason: reason || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isPending) return;
        if (!o) reset();
        setOpen(o);
      }}
    >
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + 휴가 부여
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>휴가 수동 부여</DialogTitle>
          <DialogDescription>
            관리자가 특정 직원에게 휴가 일수를 직접 부여해요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-employee" className="text-sm text-foreground-muted">
              대상 직원
            </label>
            <select
              id="grant-employee"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-10 rounded-md border border-border bg-background-primary px-3 text-base text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none"
            >
              <option value="">선택해 주세요</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-type" className="text-sm text-foreground-muted">
              휴가 종류
            </label>
            <select
              id="grant-type"
              required
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="h-10 rounded-md border border-border bg-background-primary px-3 text-base text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none"
            >
              <option value="">선택해 주세요</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-days" className="text-sm text-foreground-muted">
              부여 일수
            </label>
            <Input
              id="grant-days"
              type="number"
              required
              min="0.5"
              max="365"
              step="0.5"
              placeholder="예: 15, 0.5"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-reason" className="text-sm text-foreground-muted">
              부여 사유 (선택)
            </label>
            <Input
              id="grant-reason"
              maxLength={200}
              placeholder="예: 연차 정기 부여"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                취소
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending || !employeeId || !leaveTypeId || !days}
            >
              {isPending ? "부여 중…" : "부여"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
