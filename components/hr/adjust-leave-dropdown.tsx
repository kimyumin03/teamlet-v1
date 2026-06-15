"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import { adjustLeaveAction } from "@/lib/actions/leave";
import { TargetPicker, type PickerEmployee, type PickerDepartment } from "@/components/common/recipient-picker";
import { LeaveTypePicker } from "./leave-type-picker";

type LeaveType = { id: string; name: string };
type AdjustKind = "annual" | "incumbent" | "resigned";

const ADJUST_LABELS: Record<AdjustKind, string> = {
  annual: "연차 조정",
  incumbent: "재직자 정산용",
  resigned: "퇴직자 정산용",
};
const ADJUST_TITLES: Record<AdjustKind, string> = {
  annual: "연차 조정",
  incumbent: "재직자 정산용 조정",
  resigned: "퇴직자 정산용 조정",
};

export function AdjustLeaveDropdown({
  employees,
  departments = [],
  leaveTypes,
}: {
  employees: PickerEmployee[];
  departments?: PickerDepartment[];
  leaveTypes: LeaveType[];
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [adjustKind, setAdjustKind] = useState<AdjustKind>("annual");
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [direction, setDirection] = useState<"grant" | "deduct">("grant");
  const [days, setDays] = useState<number | "">(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const target = employees.find((e) => e.id === employeeId) ?? null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function reset() {
    setEmployeeId("");
    setLeaveTypeId("");
    setDirection("grant");
    setDays(1);
    setReason("");
    setError(null);
  }

  function openAdjust(kind: AdjustKind) {
    setAdjustKind(kind);
    setMenuOpen(false);
    reset();
    setModalOpen(true);
  }

  function handleSubmit() {
    if (!employeeId || !leaveTypeId || !days) return;
    setError(null);
    const signed = direction === "deduct" ? -Math.abs(Number(days)) : Math.abs(Number(days));
    startTransition(async () => {
      const res = await adjustLeaveAction({
        employeeId,
        leaveTypeId,
        days: signed,
        reason: reason.trim() || `[${ADJUST_TITLES[adjustKind]}]${reason ? " " + reason : ""}`,
      });
      if (res.ok) {
        setModalOpen(false);
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
      {/* 드롭다운 트리거 */}
      <div style={{ position: "relative" }} ref={menuRef}>
        <Button variant="secondary" onClick={() => setMenuOpen((v) => !v)}>
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
          연차 조정
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>

        {menuOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 210, padding: "4px 0",
          }}>
            {/* 조정 섹션 */}
            <div style={{ padding: "4px 10px 2px", fontSize: 10.5, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
              조정
            </div>
            {(["annual", "incumbent", "resigned"] as AdjustKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => openAdjust(kind)}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 14px",
                  fontSize: 13, background: "none", border: "none",
                  cursor: "pointer", color: "var(--fg)",
                }}
              >
                {ADJUST_LABELS[kind]}
              </button>
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

            {/* 조정 내역 섹션 */}
            <div style={{ padding: "4px 10px 2px", fontSize: 10.5, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
              조정 내역
            </div>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "8px 14px",
                fontSize: 13, background: "none", border: "none",
                cursor: "pointer", color: "var(--fg-muted)",
              }}
              title="준비 중"
            >
              연차 조정 내역
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "8px 14px",
                fontSize: 13, background: "none", border: "none",
                cursor: "pointer", color: "var(--fg-muted)",
              }}
              title="준비 중"
            >
              재직·퇴직자 잔여 조정 내역
            </button>
          </div>
        )}
      </div>

      {/* 조정 모달 */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!isPending) { setModalOpen(o); if (!o) reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ADJUST_TITLES[adjustKind]}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">대상자</label>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={isPending}
                className="flex items-center gap-2.5 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-left transition-colors hover:border-border-strong"
              >
                {target ? (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {target.name.slice(-2)}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{target.name}</span>
                    {target.departmentName && (
                      <span className="text-[11.5px] text-foreground-muted">· {target.departmentName}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] text-foreground-subtle">구성원 선택</span>
                )}
                <span className="ml-auto text-[13px] text-foreground-subtle">›</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">휴가 종류</label>
              <LeaveTypePicker leaveTypes={leaveTypes} value={leaveTypeId} onChange={setLeaveTypeId} disabled={isPending} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">조정 구분</label>
              <div className="flex gap-1.5">
                {([["grant", "부여 (+)"], ["deduct", "차감 (−)"]] as const).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setDirection(v)}
                    className={`flex-1 rounded-[8px] border px-3 py-2 text-[13px] font-semibold transition-colors ${
                      direction === v
                        ? v === "deduct"
                          ? "border-destructive-600 bg-destructive-50 text-destructive-600"
                          : "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background-primary text-foreground-muted"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">조정 일수</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0.5} step={0.5}
                  className="w-28 rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle"
                  value={days}
                  onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isPending} />
                <span className="text-sm text-foreground-muted">일</span>
                {Number(days) > 0 && (
                  <span className={`text-[12px] font-medium ${direction === "deduct" ? "text-destructive-600" : "text-primary"}`}>
                    {direction === "deduct" ? "−" : "+"}{Math.abs(Number(days))}일 반영
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">
                사유 <span className="text-foreground-subtle">(선택)</span>
              </label>
              <input
                className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground-subtle"
                placeholder="예: 입사 누락분 정산, 연차 차감"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
              />
            </div>

            {error && <p className="text-[12px] text-destructive-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" disabled={isPending} onClick={() => setModalOpen(false)}>취소</Button>
            <Button disabled={isPending || !isValid} onClick={handleSubmit}>
              {isPending ? "반영 중…" : "조정 반영"}
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
