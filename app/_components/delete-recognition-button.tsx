"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteRecognitionAction } from "@/lib/actions/recognition";

export function DeleteRecognitionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 메시지를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteRecognitionAction(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label="메시지 삭제"
      className="ml-1 rounded p-1 text-foreground-subtle opacity-0 transition-opacity hover:text-destructive-600 group-hover:opacity-100 disabled:opacity-30"
    >
      <Trash2 size={13} strokeWidth={2} />
    </button>
  );
}
