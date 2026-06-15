'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction, type ActionState } from '@/lib/actions/auth'

// 원본 teamlet 회원가입 폼 체제 — 이름·이메일·비밀번호.
const initial: ActionState = { error: null }
const inputCls =
  'w-full px-3.5 py-2.5 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)] text-[14px] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:border-[var(--primary)] transition-colors'

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(signupAction, initial)
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <div>
        <label htmlFor="name" className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">이름</label>
        <input id="name" name="name" required placeholder="홍길동" className={inputCls} />
      </div>
      <div>
        <label htmlFor="email" className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">이메일</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="8자 이상" className={inputCls} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-[var(--destructive-50)] bg-[var(--destructive-50)] px-3 py-2 text-[13px] text-[var(--destructive)]">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[color:var(--primary-on)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 transition-colors">
        {isPending ? '가입 중…' : '계정 만들기'}
      </button>
      <div className="text-center text-[12.5px] text-[var(--fg-muted)]">
        이미 계정이 있으신가요? <Link href="/login" className="text-[var(--primary)] font-medium">로그인 →</Link>
      </div>
    </form>
  )
}
