"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@teamlet/ui";
import { Search } from "lucide-react";

/**
 * 구성원 검색 — 클라이언트에서 디바운스(300ms) 후 URL `?q=...` 갱신.
 * 서버 컴포넌트가 q 를 받아 메모리 필터링. department 등 다른 검색 파라미터는 보존.
 */
export function MemberSearchInput({
  initialValue,
}: {
  initialValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = value.trim();
    const current = searchParams.get("q") ?? "";
    if (trimmed === current) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [value, router, pathname, searchParams]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" />
      <Input
        type="search"
        placeholder="이름·사번·이메일 검색"
        className="pl-9"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
