"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Button } from "@teamlet/ui";
import { updateAnnouncementAction, deleteAnnouncementAction, togglePinAction } from "@/lib/actions/announcement";

type Props = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
};

export function AnnouncementActions({ id, title, content, isPinned }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    setEditTitle(title);
    setEditContent(content);
    setError(null);
    setOpen(false);
    setEditOpen(true);
  }

  function handleUpdate() {
    if (!editTitle.trim() || !editContent.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updateAnnouncementAction(id, { title: editTitle, content: editContent });
      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      } else {
        setError(res.error?.message ?? "오류가 발생했어요");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAnnouncementAction(id);
      setOpen(false);
      router.refresh();
    });
  }

  function handleTogglePin() {
    startTransition(async () => {
      await togglePinAction(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-foreground-subtle hover:bg-background-secondary hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM13 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-8 z-20 w-36 rounded-[14px] border border-border bg-background-primary py-1 shadow-lg">
              <button
                onClick={handleEdit}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-background-secondary transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Zm-3.536 4.536L6.19 10.81l-.94.39.39-.94 3.761-3.762 1.061 1.061-.5-.5Z" />
                  <path d="M2.5 4.75a.25.25 0 0 1 .25-.25h4a.75.75 0 0 0 0-1.5h-4A1.75 1.75 0 0 0 1 4.75v9.5A1.75 1.75 0 0 0 2.75 16h9.5A1.75 1.75 0 0 0 14 14.25v-4a.75.75 0 0 0-1.5 0v4a.25.25 0 0 1-.25.25h-9.5a.25.25 0 0 1-.25-.25v-9.5Z" />
                </svg>
                수정
              </button>
              <button
                onClick={handleTogglePin}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-background-secondary transition-colors disabled:opacity-50"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M9.5 1.5a1 1 0 0 1 1.5-.866V4.5a1 1 0 0 1-1 1H7.414l-1.707 1.707A1 1 0 0 1 4 6.5V4.5a1 1 0 0 1-1-1V.634A1 1 0 0 1 4.5 1.5h5ZM8 8.5v5.25a.75.75 0 0 1-1.5 0V8.5H8Z" />
                </svg>
                {isPinned ? "고정 해제" : "상단 고정"}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                </svg>
                삭제
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!isPending) setEditOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지사항 수정</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground-muted">제목</label>
              <input
                className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground-muted">내용</label>
              <textarea
                rows={5}
                className="w-full resize-none rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground-subtle"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isPending}
              />
            </div>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" disabled={isPending} onClick={() => setEditOpen(false)}>취소</Button>
            <Button disabled={isPending || !editTitle.trim() || !editContent.trim()} onClick={handleUpdate}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
