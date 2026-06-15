"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@teamlet/ui";
import {
  createFamilyMemberAction,
  updateFamilyMemberAction,
  deleteFamilyMemberAction,
} from "@/lib/actions/employee-profile";
import type { FamilyMemberItem } from "@teamlet/modules/employee";
import type { Gender } from "@teamlet/modules/employee";

const RELATIONSHIP_OPTIONS = [
  "배우자", "자녀", "부모", "형제/자매", "조부모", "기타",
];

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "남성", FEMALE: "여성", OTHER: "기타",
};

function fmt(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function FamilyDialog({
  open,
  onClose,
  employeeId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  initial?: FamilyMemberItem;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [birthDate, setBirthDate] = useState(
    initial?.birthDate ? new Date(initial.birthDate).toISOString().slice(0, 10) : "",
  );
  const [gender, setGender] = useState<Gender | "">(initial?.gender ?? "");
  const [isDependent, setIsDependent] = useState(initial?.isDependent ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) { setError("이름을 입력해 주세요"); return; }
    if (!relationship.trim()) { setError("관계를 입력해 주세요"); return; }
    setError(null);
    const input = {
      name,
      relationship,
      birthDate: birthDate || null,
      gender: gender || null,
      isDependent,
    };
    startTransition(async () => {
      const res = isEdit
        ? await updateFamilyMemberAction(employeeId, initial!.id, input)
        : await createFamilyMemberAction(employeeId, input);
      if (res.ok) { onClose(); router.refresh(); }
      else setError(res.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending && !o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "가족 수정" : "가족 추가"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">이름</label>
              <input className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">관계</label>
              <input
                list="relationship-list"
                className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60"
                placeholder="예: 배우자"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                disabled={isPending}
              />
              <datalist id="relationship-list">
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">생년월일 <span className="text-foreground-subtle">(선택)</span></label>
              <input type="date" className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-muted">성별 <span className="text-foreground-subtle">(선택)</span></label>
              <select className="w-full rounded-lg border border-border bg-background-primary px-3 py-2 text-sm text-foreground outline-none focus:border-foreground-subtle disabled:opacity-60" value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} disabled={isPending}>
                <option value="">미선택</option>
                {(Object.keys(GENDER_LABEL) as Gender[]).map((v) => (
                  <option key={v} value={v}>{GENDER_LABEL[v]}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input type="checkbox" checked={isDependent} onChange={(e) => setIsDependent(e.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-border accent-foreground" />
            <span className="text-sm text-foreground">피부양자</span>
          </label>
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

export function FamilyTab({
  employeeId,
  items,
  canEdit,
}: {
  employeeId: string;
  items: FamilyMemberItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyMemberItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("이 가족 정보를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteFamilyMemberAction(employeeId, id);
      router.refresh();
    });
  }

  const dependentCount = items.filter((i) => i.isDependent).length;

  return (
    <div className="rounded-xl border border-border bg-background-primary">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            가족 사항 <span className="ml-1 text-foreground-subtle">({items.length}명)</span>
          </h2>
          {dependentCount > 0 && (
            <p className="mt-0.5 text-xs text-foreground-subtle">피부양자 {dependentCount}명</p>
          )}
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 추가
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-foreground-muted">등록된 가족 정보가 없어요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-secondary text-sm font-medium text-foreground-muted">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="rounded bg-background-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted">{item.relationship}</span>
                      {item.isDependent && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">피부양자</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {item.gender ? GENDER_LABEL[item.gender] : ""}
                      {item.gender && item.birthDate && " · "}
                      {item.birthDate ? fmt(item.birthDate) : ""}
                    </p>
                  </div>
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
          <FamilyDialog open={createOpen} onClose={() => setCreateOpen(false)} employeeId={employeeId} />
          {editTarget && (
            <FamilyDialog open onClose={() => setEditTarget(null)} employeeId={employeeId} initial={editTarget} />
          )}
        </>
      )}
    </div>
  );
}
