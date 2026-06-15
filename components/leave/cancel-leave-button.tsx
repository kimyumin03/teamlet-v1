"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@teamlet/ui";
import { cancelLeaveAction } from "@/lib/actions/leave";

export function CancelLeaveButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelLeaveAction(requestId);
      if (res.ok) {
        if (res.data?.pendingApproval) {
          alert("취소 승인을 요청했어요. 승인자가 확인하면 취소가 완료돼요.");
        }
        router.refresh();
      } else {
        alert(res.error.message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={handleCancel}
    >
      {isPending ? "취소 중…" : "취소"}
    </Button>
  );
}
