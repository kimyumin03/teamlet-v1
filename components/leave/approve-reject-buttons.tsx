"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from "@teamlet/ui";
import { approveLeaveAction, rejectLeaveAction } from "@/lib/actions/leave";

export function ApproveRejectButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveLeaveAction(requestId);
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectLeaveAction(requestId, reviewNote || undefined);
      setRejectOpen(false);
      setReviewNote("");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={handleApprove}>
          승인
        </Button>
        <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setRejectOpen(true)}>
          반려
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!isPending) setRejectOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="반려 사유 (선택)"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            maxLength={200}
          />
          <DialogFooter>
            <Button variant="secondary" disabled={isPending} onClick={() => setRejectOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              {isPending ? "처리 중…" : "반려"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
