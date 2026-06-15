"use client";

import { useState, useTransition } from "react";
import { type PendingMemberItem } from "@teamlet/modules/tenancy";
import { approveMembershipAction, rejectMembershipAction } from "@/lib/actions/join-requests";

export function PendingJoinPanel({ items }: { items: PendingMemberItem[] }) {
  const [list, setList] = useState(items);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);

  function handle(membershipId: string, action: "approve" | "reject") {
    startTransition(async () => {
      const res = action === "approve"
        ? await approveMembershipAction(membershipId)
        : await rejectMembershipAction(membershipId);
      if (!res.error) {
        setList((prev) => prev.filter((i) => i.membershipId !== membershipId));
      }
    });
  }

  if (list.length === 0 || !open) return null;

  return (
    <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
            {list.length}
          </span>
          <span className="text-sm font-medium text-amber-900">가입 신청 대기</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-amber-400 hover:text-amber-600 transition-colors"
          aria-label="닫기"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>
      <ul className="divide-y divide-amber-100">
        {list.map((item) => (
          <li key={item.membershipId} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <span className="text-sm font-medium text-foreground">{item.userName}</span>
              <span className="ml-2 text-xs text-foreground-muted">{item.userEmail}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handle(item.membershipId, "approve")}
                disabled={isPending}
                className="rounded px-2.5 py-1 text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => handle(item.membershipId, "reject")}
                disabled={isPending}
                className="rounded px-2.5 py-1 text-xs text-foreground-muted border border-border hover:bg-background-secondary disabled:opacity-50 transition-colors"
              >
                반려
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
