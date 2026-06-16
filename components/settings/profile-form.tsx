"use client";

// 내 프로필 폼 — 원본 components/settings/profile-form.tsx 를 그대로 이식.
// import 조정: 액션은 v1 @/lib/actions/profile.

import { useActionState } from "react";
import { Button } from "@teamlet/ui";
import { updateProfileAction, type ProfileActionState } from "@/lib/actions/profile";

const initial: ProfileActionState = { error: null };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-start gap-6 border-b border-border py-3.5 last:border-0">
      <div>
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-1 text-[11.5px] text-foreground-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputCls =
  "w-full max-w-[420px] rounded-[8px] border border-border-strong bg-background-primary px-3 py-2 text-[13.5px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

export function ProfileForm({
  name,
  phone,
  email,
}: {
  name: string;
  phone?: string | null;
  email?: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initial);

  return (
    <form action={formAction} className="flex flex-col">
      <Field label="본명" hint="계약·증명서에 표시됩니다">
        <input
          className={inputCls}
          id="name"
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={50}
        />
      </Field>

      {email !== undefined && (
        <Field label="이메일" hint="로그인 ID로 사용됩니다">
          <div className="flex items-center gap-2">
            <input className={inputCls} value={email} disabled readOnly />
          </div>
          <p className="mt-1.5 text-[11.5px] text-foreground-subtle">이메일 변경은 관리자에게 문의해 주세요</p>
        </Field>
      )}

      <Field label="휴대폰 번호">
        <input
          className={inputCls}
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="010-1234-5678"
        />
      </Field>

      {state.error && (
        <p role="alert" className="mt-3 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-3 rounded-[14px] border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">저장됐어요.</p>
      )}

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중…" : "변경 사항 저장"}
        </Button>
      </div>
    </form>
  );
}
