"use client";

import { useEffect, useState } from "react";

export function CommandPaletteTrigger() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  function handleClick() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-md border border-border bg-background-secondary px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-background-primary hover:text-foreground"
    >
      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <span>검색</span>
      <kbd className="rounded bg-background-primary px-1 font-mono text-foreground-subtle">
        {isMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
