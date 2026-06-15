"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import { grantLeaveAction } from "@/lib/actions/leave";
import { TargetPicker, type PickerEmployee, type PickerDepartment } from "@/components/common/recipient-picker";
import { LeaveTypePicker } from "./leave-type-picker";

type LeaveType = { id: string; name: string };

export function GrantLeaveButton({
  employees,
  departments = [],
  leaveTypes,
  presetEmployeeId,
  variant = "primary",
}: {
  employees: PickerEmployee[];
  departments?: PickerDepartment[];
  leaveTypes: LeaveType[];
  presetEmployeeId?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(presetEmployeeId ?? "");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [days, setDays] = useState<number | "">(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const target = employees.find((e) => e.id === employeeId) ?? null;

  function reset() {
    setEmployeeId(presetEmployeeId ?? "");
    setLeaveTypeId("");
    setDays(1);
    setReason("");
    setError(null);
  }

  function handleSubmit() {
    if (!employeeId || !leaveTypeId || !days) return;
    setError(null);
    startTransition(async () => {
      const res = await grantLeaveAction({
        employeeId,
        leaveTypeId,
        days: Number(days),
        reason: reason.trim() || undefined,
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(res.error?.message ?? "오류가 발생했어요");
      }
    });
  }

  const isValid = !!employeeId && !!leaveTypeId && Number(days) > 0;

  return (
    <>
      <Button variant={variant} onClick={() => { reset(); setOpen(true); }}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        맞춤 휴가 부여
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!isPending) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>맞춤 휴가 부여</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {/* 대상자 — 구성원 선택 피커 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">대상자</label>
              <button
                type="button"
                onClick={() => { if (!presetEmployeeId) setPickerOpen(true); }}
                disabled={isPending || !!presetEmployeeId}
                className="flex items-center gap-2.5 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-left transition-colors hover:border-border-strong disabled:cursor-default disabled:hover:border-border"
              >
                {target ? (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {target.name.slice(-2)}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{target.name}</span>
                    {target.departmentName && <span className="text-[11.5px] text-foreground-muted">· {target.departmentName}</span>}
                  </>
                ) : (
                  <span className="text-[13px] text-foreground-subtle">구성원 선택</span>
                )}
                {!presetEmployeeId && <span className="ml-auto text-[13px] text-foreground-subtle">›</span>}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">휴가 종류</label>
              <LeaveTypePicker leaveTypes={leaveTypes} value={leaveTypeId} onChange={setLeaveTypeId} disabled={isPending} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">부여 일수</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0.5} step={0.5}
                  className="w-28 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle"
                  value={days}
                  onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isPending}
                />
                <span className="text-sm text-foreground-muted">일</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">사유 <span className="text-foreground-subtle">(선택)</span></label>
              <input
                className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground-subtle"
                placeholder="부여 사유"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
              />
            </div>

            {error && <p className="text-[12px] text-destructive-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" disabled={isPending} onClick={() => setOpen(false)}>취소</Button>
            <Button disabled={isPending || !isValid} onClick={handleSubmit}>
              {isPending ? "부여 중…" : "휴가 부여"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pickerOpen && (
        <TargetPicker
          employees={employees}
          departments={departments}
          selectedIds={employeeId ? [employeeId] : []}
          onPick={(id) => { setEmployeeId(id); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
          title="대상자 선택"
        />
      )}
    </>
  );
}
