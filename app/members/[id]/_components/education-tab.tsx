"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import {
  createEducationHistoryAction,
  updateEducationHistoryAction,
  deleteEducationHistoryAction,
} from "@/lib/actions/employee-profile";
import type { EducationHistoryItem } from "@teamlet/modules/employee";
import type { EducationDegree } from "@teamlet/modules/employee";

const DEGREE_LABEL: Record<EducationDegree, string> = {
  HIGH_SCHOOL: "고등학교",
  ASSOCIATE: "전문학사",
  BACHELOR: "학사",
  MASTER: "석사",
  DOCTOR: "박사",
  ETC: "기타",
};

function fmt(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" });
}

function EducationDialog({
  open,
  onClose,
  employeeId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  initial?: EducationHistoryItem;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const toStr = (d: Date | null | undefined) => d ? new Date(d).toISOString().slice(0, 7) : "";

  const [schoolName, setSchoolName] = useState(initial?.schoolName ?? "");
  const [major, setMajor] = useState(initial?.major ?? "");
  const [degree, setDegree] = useState<EducationDegree>(initial?.degree ?? "BACHELOR");
  const [enrollDate, setEnrollDate] = useState(toStr(initial?.enrollDate));
  const [graduateDate, setGraduateDate] = useState(toStr(initial?.graduateDate));
  const [isEnrolled, setIsEnrolled] = useState(!initial?.graduateDate);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!schoolName.trim()) { setError("학교명을 입력해 주세요"); return; }
    if (!enrollDate) { setError("입학년월을 입력해 주세요"); return; }
    setError(null);
    const input = {
      schoolName, major, degree,
      enrollDate: enrollDate + "-01",
      graduateDate: isEnrolled ? null : (graduateDate ? graduateDate + "-01" : null),
      description,
    };
    startTransition(async () => {
      const res = isEdit
        ? await updateEducationHistoryAction(employeeId, initial!.id, input)
        : await createEducationHistoryAction(employeeId, input);
      if (res.ok) { onClose(); router.refresh(); }
      else setError(res.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending && !o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "학력 수정" : "학력 추가"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">학교명</label>
            <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="예: 한국대학교" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">학위</label>
              <select className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={degree} onChange={(e) => setDegree(e.target.value as EducationDegree)} disabled={isPending}>
                {(Object.keys(DEGREE_LABEL) as EducationDegree[]).map((v) => (
                  <option key={v} value={v}>{DEGREE_LABEL[v]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">전공 <span className="text-foreground-subtle">(선택)</span></label>
              <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="예: 컴퓨터공학" value={major} onChange={(e) => setMajor(e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">입학년월</label>
              <input type="month" className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={enrollDate} onChange={(e) => setEnrollDate(e.target.value)} disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">졸업년월</label>
              <input type="month" className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={isEnrolled ? "" : graduateDate} onChange={(e) => setGraduateDate(e.target.value)} disabled={isPending || isEnrolled} />
            </div>
          </div>
          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input type="checkbox" checked={isEnrolled} onChange={(e) => setIsEnrolled(e.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-border accent-foreground" />
            <span className="text-sm text-foreground">재학 중</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-muted">비고 <span className="text-foreground-subtle">(선택)</span></label>
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

export function EducationTab({
  employeeId,
  items,
  canEdit,
}: {
  employeeId: string;
  items: EducationHistoryItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EducationHistoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("이 학력을 삭제할까요?")) return;
    startTransition(async () => {
      await deleteEducationHistoryAction(employeeId, id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-background-primary">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">학력 사항 <span className="ml-1 text-foreground-subtle">({items.length})</span></h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 추가
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-foreground-muted">등록된 학력이 없어요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.schoolName}</span>
                    {!item.graduateDate && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">재학중</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {DEGREE_LABEL[item.degree]}
                    {item.major && <span className="text-foreground-subtle"> · {item.major}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-subtle">
                    {fmt(item.enrollDate)} ~ {item.graduateDate ? fmt(item.graduateDate) : "재학중"}
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
          <EducationDialog open={createOpen} onClose={() => setCreateOpen(false)} employeeId={employeeId} />
          {editTarget && (
            <EducationDialog open onClose={() => setEditTarget(null)} employeeId={employeeId} initial={editTarget} />
          )}
        </>
      )}
    </div>
  );
}
