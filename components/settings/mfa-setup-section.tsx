"use client";

// 2단계 인증(2FA) 설정 섹션 — 원본 components/settings/mfa-setup-section.tsx 를 그대로 이식.
// import 조정: 액션은 v1 @/lib/actions/mfa, MfaStatus 는 @teamlet/modules/company.
//   next/image 대신 <img> 사용(원격 QR 도메인 설정 불필요).
// ⚠️ v1 user_mfa 테이블 미연결이라 "설정하기" 시 준비 중 안내가 떠요(액션에서 처리). UI/UX 는 동일.

import { useState, useTransition } from "react";
import { Button, Input } from "@teamlet/ui";
import { generateMfaSecretAction, enableMfaAction, disableMfaAction } from "@/lib/actions/mfa";
import type { MfaStatus } from "@teamlet/modules/company";

type Step = "idle" | "setup" | "disable";

export function MfaSetupSection({ initial }: { initial: MfaStatus }) {
  const [status, setStatus] = useState(initial);
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep("idle");
    setQrDataUrl(null);
    setSecret(null);
    setCode("");
    setError(null);
  }

  function startSetup() {
    setError(null);
    startTransition(async () => {
      const res = await generateMfaSecretAction();
      if (!res.ok) { setError(res.error.message); return; }
      setQrDataUrl(res.data.qrDataUrl);
      setSecret(res.data.secret);
      setStep("setup");
    });
  }

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      const res = await enableMfaAction(code);
      if (!res.ok) { setError(res.error.message); return; }
      setStatus({ isEnabled: true, enabledAt: new Date() });
      reset();
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const res = await disableMfaAction(code);
      if (!res.ok) { setError(res.error.message); return; }
      setStatus({ isEnabled: false, enabledAt: null });
      reset();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-background-primary p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">2단계 인증 (2FA)</h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {status.isEnabled
              ? `활성화됨 · Google Authenticator 등 앱으로 코드를 생성해요`
              : "로그인 시 추가 인증 코드로 계정을 보호해요"}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            status.isEnabled
              ? "bg-success-50 text-success-700"
              : "bg-background-secondary text-foreground-muted"
          }`}
        >
          {status.isEnabled ? "활성" : "비활성"}
        </span>
      </div>

      {step === "idle" && (
        <Button
          size="sm"
          variant={status.isEnabled ? "secondary" : "primary"}
          onClick={status.isEnabled ? () => setStep("disable") : startSetup}
          disabled={isPending}
        >
          {isPending ? "처리 중…" : status.isEnabled ? "2FA 비활성화" : "2FA 설정하기"}
        </Button>
      )}

      {step === "setup" && qrDataUrl && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            Google Authenticator 또는 호환 앱으로 QR 코드를 스캔하세요.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="2FA QR code" width={180} height={180} />
          <div className="rounded-md bg-background-secondary px-3 py-2">
            <p className="text-xs text-foreground-subtle mb-1">수동 입력 키</p>
            <code className="text-xs font-mono text-foreground break-all">{secret}</code>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">앱에서 생성된 6자리 코드 입력</label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isPending}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEnable} disabled={isPending || code.length !== 6}>
              {isPending ? "확인 중…" : "활성화"}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} disabled={isPending}>
              취소
            </Button>
          </div>
        </div>
      )}

      {step === "disable" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            비활성화하려면 인증 앱의 현재 코드를 입력하세요.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground-muted">인증 코드</label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isPending}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleDisable} disabled={isPending || code.length !== 6}>
              {isPending ? "처리 중…" : "비활성화"}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} disabled={isPending}>
              취소
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
