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
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/lib/actions/department";

/**
 * 선택된 부서의 이름 변경 / 삭제 액션.
 * 자식·직원 있는 부서 삭제는 모듈 가드가 차단 — 사용자에겐 에러 메시지로 전달.
 */
export function DepartmentActions({
  departmentId,
  departmentName,
}: {
  departmentId: string;
  departmentName: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <RenameButton
        departmentId={departmentId}
        currentName={departmentName}
      />
      <DeleteButton
        departmentId={departmentId}
        departmentName={departmentName}
      />
    </div>
  );
}

function RenameButton({
  departmentId,
  currentName,
}: {
  departmentId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateDepartmentAction(departmentId, { name });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) {
          if (!o) {
            setName(currentName);
            setError(null);
          }
          setOpen(o);
        }
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="부서명 변경"
      >
        <Pencil className="size-3.5" />
        이름 변경
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부서명 변경</DialogTitle>
          <DialogDescription>
            같은 위치(같은 상위 부서)의 다른 부서와 이름이 겹치지 않아야 해요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="dept-rename"
              className="text-sm text-foreground-muted"
            >
              부서명
            </label>
            <Input
              id="dept-rename"
              required
              minLength={1}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <Button
              type="submit"
              disabled={
                isPending ||
                name.trim().length < 1 ||
                name.trim() === currentName
              }
            >
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({
  departmentId,
  departmentName,
}: {
  departmentId: string;
  departmentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await deleteDepartmentAction(departmentId);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      router.replace("/members");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) {
          if (!o) setError(null);
          setOpen(o);
        }
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="부서 삭제"
        className="text-destructive hover:bg-destructive/5"
      >
        <Trash2 className="size-3.5" />
        삭제
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{departmentName} 부서를 삭제할까요?</DialogTitle>
          <DialogDescription>
            하위 부서나 배정된 구성원이 있으면 삭제할 수 없어요. 데이터는
            보존되며 비활성 상태로만 전환돼요.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
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
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? "삭제 중…" : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
