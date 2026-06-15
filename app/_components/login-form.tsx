'use client'

import { useState, useActionState, useRef } from 'react'
import Link from 'next/link'
import { loginAction, demoLoginAction, type ActionState } from '@/lib/actions/auth'

// 원본 teamlet 로그인 폼 체제 — 2단계(이메일→비밀번호) + 회원가입 + AxHub + 데모 체험.
const initial: ActionState = { error: null }

const demoBtnCls =
  'w-full py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[13.5px] font-medium text-[var(--fg)] hover:bg-[var(--bg-secondary)] disabled:opacity-60 transition-colors'
const inputCls =
  'w-full px-3.5 py-2.5 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)] text-[14px] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:border-[var(--primary)] transition-colors'

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initial)
  const [demoState, demoFormAction, isDemoPending] = useActionState(demoLoginAction, initial)
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    const val = emailRef.current?.value.trim() ?? ''
    if (!val || !val.includes('@')) {
      emailRef.current?.focus()
      return
    }
    setEmail(val)
    setStep('password')
  }

  return (
    <div className="flex flex-col gap-3.5">
      <form className="flex flex-col gap-3.5" action={formAction} onSubmit={step === 'email' ? handleNext : undefined}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

        <div>
          <label htmlFor="email" className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">이메일</label>
          <input
            ref={emailRef}
            id="email" name="email" type="email"
            autoComplete="email" required
            placeholder="you@company.com"
            defaultValue={email}
            readOnly={step === 'password'}
            autoFocus={step === 'email'}
            className={`${inputCls}${step === 'password' ? ' opacity-70 cursor-default' : ''}`}
          />
          {step === 'password' && (
            <button type="button" onClick={() => setStep('email')} className="mt-1 text-[11.5px] text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors">
              이메일 변경
            </button>
          )}
        </div>

        {step === 'password' && (
          <div>
            <label htmlFor="password" className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">비밀번호</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" autoFocus className={inputCls} />
          </div>
        )}

        {state.error && (
          <p role="alert" className="rounded-[10px] border border-[var(--destructive-50)] bg-[var(--destructive-50)] px-3 py-2 text-[13px] text-[var(--destructive)]">{state.error}</p>
        )}

        <button type="submit" disabled={isPending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[color:var(--primary-on)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 transition-colors">
          {step === 'email' ? '다음' : isPending ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <div className="text-center text-[12.5px] text-[var(--fg-muted)]">
        계정이 없으신가요? <Link href="/signup" className="text-[var(--primary)] font-medium">회원가입 →</Link>
      </div>

      <div className="flex items-center gap-2.5 text-[11px] text-[var(--fg-subtle)] uppercase tracking-[0.08em]">
        <span className="flex-1 h-px bg-[var(--border)]" />또는<span className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <Link href="/" className="flex items-center justify-center gap-2.5 w-full px-3.5 py-3 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)] text-[13.5px] font-medium hover:bg-[var(--bg-secondary)] transition-colors" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
        <span className="w-[18px] h-[18px] rounded-md grid place-items-center bg-[var(--primary)] text-[10px] font-bold text-white">A</span>
        AxHub로 계속하기
      </Link>

      <div className="pt-1 border-t border-[var(--border)]">
        <p className="text-center text-[11.5px] text-[var(--fg-subtle)] mb-2.5">계정 없이 관리자 권한으로 모든 기능을 체험해 보세요</p>
        <form action={demoFormAction}>
          <button type="submit" disabled={isDemoPending} className={demoBtnCls}>
            {isDemoPending ? '로그인 중…' : '데모 관리자로 체험 시작 →'}
          </button>
        </form>
        {demoState.error && (
          <p role="alert" className="mt-2 rounded-[10px] border border-[var(--destructive-50)] bg-[var(--destructive-50)] px-3 py-2 text-[13px] text-[var(--destructive)]">{demoState.error}</p>
        )}
      </div>
    </div>
  )
}
