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
import type { DepartmentNode } from "@teamlet/modules/department";
import type { PositionItem } from "@teamlet/modules/position";
import { createAppointmentAction } from "@/lib/actions/appointment";

type AppointmentKindOption = "TRANSFER" | "PROMOTION" | "POSITION_CHANGE" | "REASSIGN";

const KIND_OPTIONS: { value: AppointmentKindOption; label: string }[] = [
  { value: "TRANSFER", label: "부서 이동" },
  { value: "PROMOTION", label: "승진" },
  { value: "POSITION_CHANGE", label: "직책 변경" },
  { value: "REASSIGN", label: "부서·직책 변경" },
];

const SELECT_CLASS =
  "h-10 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none";

export function RegisterAppointmentButton({
  employeeId,
  currentDepartmentId,
  currentPositionId,
  departments,
  positions,
}: {
  employeeId: string;
  currentDepartmentId: string | null;
  currentPositionId: string | null;
  departments: DepartmentNode[];
  positions: PositionItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AppointmentKindOption>("TRANSFER");
  const [effectiveDate, setEffectiveDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [departmentId, setDepartmentId] = useState(currentDepartmentId ?? "");
  const [positionId, setPositionId] = useState(currentPositionId ?? "");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setKind("TRANSFER");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setDepartmentId(currentDepartmentId ?? "");
    setPositionId(currentPositionId ?? "");
    setMemo("");
    setError(null);
  }

  const noChange =
    (departmentId || null) === currentDepartmentId &&
    (positionId || null) === currentPositionId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAppointmentAction({
        employeeId,
        kind,
        effectiveDate,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        memo: memo || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isPending) return;
        setOpen(o);
        if (o) reset();
      }}
    >
      <Button onClick={() => setOpen(true)}>발령 등록</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>인사 발령 등록</DialogTitle>
          <DialogDescription>
            부서·직책 변경을 발령 이력으로 기록해요. 현재 값이 미리 채워져 있어요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-kind" className="text-sm text-foreground-muted">
                발령 유형
              </label>
              <select
                id="appt-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as AppointmentKindOption)}
                className={SELECT_CLASS}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-date" className="text-sm text-foreground-muted">
                발령일
              </label>
              <Input
                id="appt-date"
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-dept" className="text-sm text-foreground-muted">
                부서
              </label>
              <select
                id="appt-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">미배정</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-pos" className="text-sm text-foreground-muted">
                직책
              </label>
              <select
                id="appt-pos"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">미지정</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isOrgHead ? " (조직장)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="appt-memo" className="text-sm text-foreground-muted">
              메모 (선택)
            </label>
            <textarea
              id="appt-memo"
              maxLength={500}
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="rounded-md border border-border bg-background-primary px-3 py-2 text-sm text-foreground focus-visible:border-border-focus focus-visible:shadow-focus focus-visible:outline-none"
            />
          </div>

          {noChange && (
            <p className="text-xs text-foreground-subtle">
              현재 부서·직책과 동일해요. 한 가지 이상 변경해야 등록할 수 있어요.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || noChange}>
              {isPending ? "등록 중…" : "발령 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
