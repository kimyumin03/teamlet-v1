"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { searchEmployeesAction, type EmployeeSearchResult } from "@/lib/actions/search";

// adminOnly=false 는 전 구성원 공개(홈/휴가/문서·증명서), true 는 관리자 권한 필요
const NAV_PAGES = [
  { label: "홈", href: "/", keyword: "home 홈", adminOnly: false },
  { label: "내 휴가", href: "/leave", keyword: "leave 휴가", adminOnly: false },
  { label: "문서·증명서", href: "/documents", keyword: "documents 문서 증명서", adminOnly: false },
  { label: "구성원", href: "/members", keyword: "members 구성원", adminOnly: true },
  { label: "워크플로우", href: "/workflow", keyword: "workflow 결재", adminOnly: true },
  { label: "휴가 관리", href: "/hr/leave", keyword: "hr leave 휴가관리", adminOnly: true },
  { label: "채용", href: "/recruit", keyword: "recruit 채용", adminOnly: true },
  { label: "설정", href: "/settings/profile", keyword: "settings 설정", adminOnly: true },
];

function initials(name: string) {
  return name.slice(0, 1);
}

export function CommandPalette({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const pages = NAV_PAGES.filter((p) => !p.adminOnly || isAdmin);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setQuery("");
      setEmployees([]);
    }
  }, [open]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length >= 1) {
      startTransition(async () => {
        const results = await searchEmployeesAction(value);
        setEmployees(results);
      });
    } else {
      setEmployees([]);
    }
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* palette */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background-primary shadow-2xl">
        <Command
          shouldFilter={employees.length === 0}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          {/* 검색 입력 */}
          <div className="flex items-center gap-2 border-b border-border px-4">
            <svg className="size-4 shrink-0 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="구성원 또는 페이지 검색…"
              className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-subtle outline-none"
              autoFocus
            />
            {isPending && (
              <span className="shrink-0 text-xs text-foreground-subtle">검색 중…</span>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded p-1 text-foreground-subtle hover:bg-background-secondary hover:text-foreground transition-colors"
              aria-label="닫기"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-foreground-muted">
              결과가 없어요
            </Command.Empty>

            {/* 구성원 검색 결과 */}
            {employees.length > 0 && (
              <Command.Group
                heading="구성원"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle"
              >
                {employees.map((emp) => (
                  <Command.Item
                    key={emp.id}
                    value={`employee-${emp.id}-${emp.name}`}
                    onSelect={() => navigate(`/members/${emp.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background-secondary"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-semibold">
                      {initials(emp.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{emp.name}</p>
                      {(emp.departmentName || emp.positionName) && (
                        <p className="truncate text-xs text-foreground-muted">
                          {[emp.departmentName, emp.positionName].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 페이지 네비게이션 — 권한에 따라 접근 가능한 페이지만 */}
            <Command.Group
              heading="페이지"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle"
            >
              {pages.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.keyword}`}
                  onSelect={() => navigate(item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background-secondary"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background-secondary text-xs text-foreground-muted font-medium">
                    {item.href.replace(/^\/settings\//, "⚙ ").replace(/^\//, "").slice(0, 2).toUpperCase()}
                  </span>
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2.5">
            <p className="text-xs text-foreground-subtle">
              <kbd className="rounded bg-background-secondary px-1 font-mono">↑↓</kbd> 이동
              {" · "}
              <kbd className="rounded bg-background-secondary px-1 font-mono">↵</kbd> 선택
              {" · "}
              <kbd className="rounded bg-background-secondary px-1 font-mono">Esc</kbd> 닫기
            </p>
          </div>
        </Command>
      </div>
    </div>
  );
}
