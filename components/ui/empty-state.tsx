"use client";

import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";

/**
 * EmptyState (docs/05 §4-6) — 모든 빈 리스트/페이지 표준.
 * 회색조 아이콘(slate-300, 48px) + 제목 + 설명 + 선택 액션.
 */
export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="text-foreground-subtle [&_svg]:size-12">{icon}</div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-lg font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-foreground-muted">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant === "secondary" ? "secondary" : "primary"}
          size="sm"
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
