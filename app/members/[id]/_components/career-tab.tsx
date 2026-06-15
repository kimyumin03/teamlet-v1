"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import {
  createCareerHistoryAction,
  updateCareerHistoryAction,
  deleteCareerHistoryAction,
} from "@/lib/actions/employee-profile";
import type { CareerHistoryItem } from "@teamlet/modules/employee";

function fmt(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" });
}

function CareerDialog({
  open,
  onClose,
  employeeId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  initial?: CareerHistoryItem;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const toStr = (d: Date | null | undefined) => d ? new Date(d).toISOString().slice(0, 7) : "";

  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [startDate, setStartDate] = useState(toStr(initial?.startDate));
  const [endDate, setEndDate] = useState(toStr(initial?.endDate));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isCurrent, setIsCurrent] = useState(!initial?.endDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!companyName.trim()) { setError("회사명을 입력해 주세요"); return; }
    if (!position.trim()) { setError("직위/직책을 입력해 주세요"); return; }
    if (!startDate) { setError("입사일을 입력해 주세요"); return; }
    setError(null);
    const input = {
      companyName, position, department,
      startDate: startDate + "-01",
      endDate: isCurrent ? null : (endDate ? endDate + "-01" : null),
      description,
    };
    startTransition(async () => {
      const res = isEdit
        ? await updateCareerHistoryAction(employeeId, initial!.id, input)
        : await createCareerHistoryAction(employeeId, input);
      if (res.ok) { onClose(); router.refresh(); }
      else setError(res.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending && !o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "경력 수정" : "경력 추가"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">회사명</label>
            <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="예: (주)테크컴퍼니" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">직위/직책</label>
              <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="예: 시니어 개발자" value={position} onChange={(e) => setPosition(e.target.value)} disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">부서 <span className="text-foreground-subtle">(선택)</span></label>
              <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="예: 개발팀" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">입사년월</label>
              <input type="month" className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">퇴사년월</label>
              <input type="month" className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={isCurrent ? "" : endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isPending || isCurrent} />
            </div>
          </div>
          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-border accent-foreground" />
            <span className="text-sm text-foreground">현재 재직 중</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">업무 내용 <span className="text-foreground-subtle">(선택)</span></label>
            <textarea className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60 resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
          </div>
          {error && <p className="text-xs text-destructive-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" disabled={isPending} onClick={onClose}>취소</Button>
          <Button disabled={isPending} onClick={handleSubmit}>{isPending ? "저장 중…" : isEdit ? "저장" : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CareerTab({
  employeeId,
  items,
  canEdit,
}: {
  employeeId: string;
  items: CareerHistoryItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CareerHistoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("이 경력을 삭제할까요?")) return;
    startTransition(async () => {
      await deleteCareerHistoryAction(employeeId, id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-background-primary">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">경력 사항 <span className="ml-1 text-foreground-subtle">({items.length})</span></h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 추가
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-foreground-muted">등록된 경력이 없어요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.companyName}</span>
                    {!item.endDate && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">재직중</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {item.position}
                    {item.department && <span className="text-foreground-subtle"> · {item.department}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-subtle">
                    {fmt(item.startDate)} ~ {item.endDate ? fmt(item.endDate) : "현재"}
                  </p>
                  {item.description && <p className="mt-1 text-xs text-foreground-muted">{item.description}</p>}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="rounded-md p-1.5 text-foreground-subtle hover:bg-background-secondary hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={isPending} className="rounded-md p-1.5 text-foreground-subtle hover:bg-destructive-50 hover:text-destructive-600 transition-colors disabled:opacity-40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          <CareerDialog open={createOpen} onClose={() => setCreateOpen(false)} employeeId={employeeId} />
          {editTarget && (
            <CareerDialog open onClose={() => setEditTarget(null)} employeeId={employeeId} initial={editTarget} />
          )}
        </>
      )}
    </div>
  );
}
