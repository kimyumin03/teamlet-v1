"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@teamlet/ui";
import { Shield, Trash2 } from "lucide-react";
import type { EmployeeRoleAssignment } from "@teamlet/modules/employee";
import type { RoleListItem } from "@teamlet/modules/permission";
import { assignRoleAction, revokeRoleAction } from "@/lib/actions/permission";

const SYSTEM_LABEL: Record<string, string> = {
  SYSTEM_SUPER_ADMIN: "최고 관리자",
  DYNAMIC_ORG_HEAD: "조직장 (동적)",
  DEFAULT: "기본",
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 구성원 상세 "권한" 탭 — UserRole 배정/해제.
 * `assignableRoles` 가 비어 있으면(= listRoles 실패, 권한 없음) 편집 UI를 숨긴다.
 */
export function MemberRolesManager({
  employeeId,
  employeeName,
  assignedRoles,
  assignableRoles,
}: {
  employeeId: string;
  employeeName: string;
  assignedRoles: EmployeeRoleAssignment[];
  assignableRoles: RoleListItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = assignableRoles.length > 0;
  const assignedRoleIds = new Set(assignedRoles.map((r) => r.roleId));
  // 부여 후보: 활성 + 동적 역할(조직장) 제외 + 미배정
  const candidates = assignableRoles.filter(
    (r) =>
      r.isActive &&
      r.type !== "DYNAMIC_ORG_HEAD" &&
      !assignedRoleIds.has(r.id),
  );

  function handleRevoke(userRoleId: string) {
    setError(null);
    setPendingId(userRoleId);
    startTransition(async () => {
      const res = await revokeRoleAction(userRoleId);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-[14px] border border-border bg-background-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-foreground-subtle" />
          <h2 className="text-sm font-medium text-foreground">
            배정된 역할 ({assignedRoles.length})
          </h2>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setAdding(true);
            }}
          >
            + 역할 부여
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      {assignedRoles.length === 0 ? (
        <p className="text-sm text-foreground-muted">배정된 역할이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignedRoles.map((r) => {
            const isDynamic = r.roleType === "DYNAMIC_ORG_HEAD";
            return (
              <li
                key={r.userRoleId}
                className="flex items-center justify-between rounded-md bg-background-secondary px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {r.roleName}
                  </span>
                  {r.isSystem && (
                    <span className="text-xs text-foreground-muted">
                      {SYSTEM_LABEL[r.roleType] ?? "시스템"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground-subtle">
                    {formatDate(r.assignedAt)}
                  </span>
                  {canManage && !isDynamic && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${r.roleName} 해제`}
                      disabled={isPending && pendingId === r.userRoleId}
                      onClick={() => handleRevoke(r.userRoleId)}
                    >
                      <Trash2 className="size-4 text-foreground-muted" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AssignRoleDialog
        open={adding}
        onOpenChange={setAdding}
        employeeId={employeeId}
        employeeName={employeeName}
        candidates={candidates}
        onDone={() => {
          setAdding(false);
          router.refresh();
        }}
        onError={setError}
      />
    </section>
  );
}

function AssignRoleDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  candidates,
  onDone,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  candidates: RoleListItem[];
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setFieldError(null);
    startTransition(async () => {
      const res = await assignRoleAction(employeeId, selectedId);
      if (!res.ok) {
        setFieldError(res.error.message);
        onError(res.error.message);
        return;
      }
      setSelectedId(null);
      onDone();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>역할 부여</DialogTitle>
          <DialogDescription>
            {employeeName} 님에게 부여할 역할을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              부여할 수 있는 역할이 없어요. 먼저 권한 설정에서 역할을 만들어
              주세요.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {candidates.map((r) => (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 hover:bg-background-secondary">
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={selectedId === r.id}
                      onChange={() => setSelectedId(r.id)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {r.name}
                      </span>
                      {r.description && (
                        <span className="text-xs text-foreground-muted">
                          {r.description}
                        </span>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {fieldError && (
            <p
              role="alert"
              className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
            >
              {fieldError}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !selectedId}>
              {isPending ? "부여 중…" : "부여"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
