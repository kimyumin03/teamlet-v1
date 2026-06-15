"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

/**
 * DirtyGuardModal (docs/05 §4-4) — 폼 수정 중 이탈 차단.
 * Primary "나가기" = destructive (위험), Secondary "이어서 진행하기".
 * isDirty 시 브라우저 unload(새로고침/탭닫기)도 가드.
 *
 * 라우터 인터셉트는 호출 측이 open 을 제어 (Next.js App Router 한계 — Phase 1).
 */
export type DirtyGuardModalProps = {
  isDirty: boolean;
  open: boolean;
  onLeave: () => void;
  onStay: () => void;
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export function DirtyGuardModal({
  isDirty,
  open,
  onLeave,
  onStay,
  title = "저장되지 않은 변경 사항이 있어요",
  description = "지금 나가면 입력한 내용이 사라져요.",
  primaryLabel = "나가기",
  secondaryLabel = "이어서 진행하기",
}: DirtyGuardModalProps) {
  React.useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onStay()}>
      <DialogContent showClose={false} className="max-w-[440px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-500" />
            <div className="flex flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onStay}>
            {secondaryLabel}
          </Button>
          <Button variant="destructive" onClick={onLeave}>
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
