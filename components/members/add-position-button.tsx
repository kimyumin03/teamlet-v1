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
import { createPositionAction } from "@/lib/actions/position";

export function AddPositionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isOrgHead, setIsOrgHead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setIsOrgHead(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPositionAction({ name, isOrgHead });
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
        + 직책
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>직책 추가</DialogTitle>
          <DialogDescription>
            예: 사원 / 대리 / 팀장 / 이사. 조직장 직책은 권한 평가에 사용돼요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pos-name"
              className="text-sm text-foreground-muted"
            >
              직책명
            </label>
            <Input
              id="pos-name"
              required
              minLength={1}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isOrgHead}
              onChange={(e) => setIsOrgHead(e.target.checked)}
              className="size-4 rounded border-border text-primary"
            />
            <span>조직장 직책으로 지정 (부서장 권한 자동 부여)</span>
          </label>

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
            <Button type="submit" disabled={isPending || name.trim().length < 1}>
              {isPending ? "추가 중…" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
