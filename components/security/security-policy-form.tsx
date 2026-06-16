"use client";

// 회사 보안 정책 폼 — 원본 components/security/security-policy-form.tsx 를 그대로 이식.
// import 조정: MfaMethod 는 @teamlet/db 대신 @teamlet/modules/company(유니온)에서.
// ⚠️ v1 schema 는 mfaEnabled/ipRestrictionEnabled 만 저장 — mfaMethod/IP 목록/applyToSuperAdmin 은
//    화면 입력은 유지하되 저장은 두 토글만 반영돼요(액션에서 처리).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@teamlet/ui";
import { updateSecurityPolicyAction } from "@/lib/actions/security";
import type { SecurityPolicyItem, MfaMethod } from "@teamlet/modules/company";

const MFA_METHODS: { value: MfaMethod; label: string }[] = [
  { value: "OTP", label: "OTP (앱 인증)" },
  { value: "EMAIL", label: "이메일" },
  { value: "SMS", label: "SMS" },
];

export function SecurityPolicyForm({ initialPolicy }: { initialPolicy: SecurityPolicyItem }) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initialPolicy);
  const [mfaExemptInput, setMfaExemptInput] = useState(initialPolicy.mfaExemptIps.join("\n"));
  const [allowedIpsInput, setAllowedIpsInput] = useState(initialPolicy.allowedIps.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function parseIps(text: string) {
    return text.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateSecurityPolicyAction({
        ...policy,
        mfaExemptIps: parseIps(mfaExemptInput),
        allowedIps: parseIps(allowedIpsInput),
      });
      if (!res.ok) { setError(res.error.message); return; }
      setSaved(true);
      router.refresh();
    });
  }

  const toggleClass = (on: boolean) =>
    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`;

  const selectClass = "h-10 w-full rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:border-border-focus focus-visible:outline-none";
  const textareaClass = "w-full rounded-md border border-border bg-background-primary px-3 py-2 text-sm text-foreground focus-visible:border-border-focus focus-visible:outline-none disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠ 아래 정책은 저장되지만, 로그인·접근 시 <strong>강제 적용은 아직
        준비 중</strong>이에요. 현재는 정책 값만 보관돼요 — 2FA·IP 제한이
        실제로 동작한다고 가정하지 마세요. (v1: 2FA/IP 활성 토글만 저장)
      </p>

      {/* 2FA 섹션 */}
      <section className="rounded-lg border border-border p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-medium text-foreground">
            2단계 인증 (2FA)
          </h2>
          <span className="rounded bg-background-secondary px-1.5 py-0.5 text-[11px] text-foreground-muted">
            준비 중
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">전체 2FA 강제 적용</p>
              <p className="text-xs text-foreground-muted">활성화 시 모든 구성원이 로그인할 때 2FA 인증을 요구해요</p>
            </div>
            <button
              type="button"
              onClick={() => setPolicy((p) => ({ ...p, mfaEnabled: !p.mfaEnabled }))}
              className={toggleClass(policy.mfaEnabled)}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy.mfaEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {policy.mfaEnabled && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">인증 방식</label>
                <select
                  value={policy.mfaMethod}
                  onChange={(e) => setPolicy((p) => ({ ...p, mfaMethod: e.target.value as MfaMethod }))}
                  className={selectClass}
                >
                  {MFA_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">2FA 면제 IP (줄바꿈으로 구분)</label>
                <textarea
                  rows={3}
                  placeholder={"192.168.1.0/24\n10.0.0.1"}
                  value={mfaExemptInput}
                  onChange={(e) => setMfaExemptInput(e.target.value)}
                  className={textareaClass}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">슈퍼 관리자에게도 적용</p>
                  <p className="text-xs text-foreground-muted">기본값은 슈퍼 관리자 제외</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicy((p) => ({ ...p, applyToSuperAdmin: !p.applyToSuperAdmin }))}
                  className={toggleClass(policy.applyToSuperAdmin)}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy.applyToSuperAdmin ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* IP 제한 섹션 */}
      <section className="rounded-lg border border-border p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-medium text-foreground">IP 접근 제한</h2>
          <span className="rounded bg-background-secondary px-1.5 py-0.5 text-[11px] text-foreground-muted">
            준비 중
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">IP 화이트리스트 활성화</p>
              <p className="text-xs text-foreground-muted">허용 IP 외의 접근을 차단해요</p>
            </div>
            <button
              type="button"
              onClick={() => setPolicy((p) => ({ ...p, ipRestrictionEnabled: !p.ipRestrictionEnabled }))}
              className={toggleClass(policy.ipRestrictionEnabled)}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy.ipRestrictionEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {policy.ipRestrictionEnabled && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground-muted">허용 IP 목록 (줄바꿈으로 구분, CIDR 지원)</label>
              <textarea
                rows={4}
                placeholder={"192.168.1.0/24\n10.0.0.1"}
                value={allowedIpsInput}
                onChange={(e) => setAllowedIpsInput(e.target.value)}
                className={textareaClass}
              />
            </div>
          )}
        </div>
      </section>

      {error && <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}
      {saved && <p className="text-sm text-foreground-muted">저장되었어요.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
