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
import { deactivateEmployeeAction } from "@/lib/actions/employee";

/**
 * 구성원 비활성화(퇴직) 버튼 — Confirm Dialog.
 * 마지막 SUPER_ADMIN / 본인 비활성화는 모듈 가드가 차단해 에러로 표시.
 */
export function DeactivateEmployeeButton({
  employeeId,
  employeeName,
  redirectAfter,
}: {
  employeeId: string;
  employeeName: string;
  redirectAfter?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await deactivateEmployeeAction(
        employeeId,
        reason.trim() || undefined,
      );
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      if (redirectAfter) {
        router.push(redirectAfter);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) {
          if (!o) {
            setReason("");
            setError(null);
          }
          setOpen(o);
        }
      }}
    >
      <Button variant="destructive" onClick={() => setOpen(true)}>
        퇴직 처리
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employeeName}님을 퇴직 처리할까요?</DialogTitle>
          <DialogDescription>
            모든 역할이 해제되고 디렉토리에서 비활성화돼요. 마지막 최고 관리자는
            퇴직 처리할 수 없어요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="deactivate-reason"
            className="text-sm text-foreground-muted"
          >
            사유 (선택)
          </label>
          <Input
            id="deactivate-reason"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 2026-06-30 자 퇴직"
          />
        </div>

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
            {isPending ? "처리 중…" : "퇴직 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
