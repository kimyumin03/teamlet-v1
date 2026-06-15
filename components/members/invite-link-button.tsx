"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { generateInviteLinkAction, type InviteActionState } from "@/lib/actions/invite";

const initial: InviteActionState = { error: null };

export function InviteLinkButton({ employeeId }: { employeeId: string }) {
  const [state, formAction, isPending] = useActionState(generateInviteLinkAction, initial);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.inviteUrl && inputRef.current) {
      inputRef.current.select();
    }
  }, [state.inviteUrl]);

  function handleCopy() {
    if (!state.inviteUrl) return;
    navigator.clipboard.writeText(state.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (state.inviteUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          readOnly
          value={state.inviteUrl}
          className="h-8 w-64 rounded-md border border-border bg-background-secondary px-2 text-xs text-foreground-muted focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className="h-8 shrink-0 rounded-md border border-border bg-background-primary px-3 text-xs text-foreground hover:bg-background-secondary"
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="employeeId" value={employeeId} />
      {state.error && (
        <p className="mb-1 text-[12px] text-destructive">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-md border border-border bg-background-primary px-3 text-xs text-foreground hover:bg-background-secondary disabled:opacity-50"
      >
        {isPending ? "생성 중…" : "초대 링크 생성"}
      </button>
    </form>
  );
}
