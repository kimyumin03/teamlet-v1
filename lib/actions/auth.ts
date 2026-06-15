'use server'

import { redirect } from 'next/navigation'

// 인증 액션 — 원본 teamlet 로그인 체제(폼 구조)를 유지하되,
// 실제 인증은 axhub 세션이 처리하므로 입력 후 홈으로 보내요.
// (NextAuth/자체 세션을 붙일 때 이 함수들만 교체하면 돼요.)
export type ActionState = { error: string | null }

export async function loginAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  redirect('/')
}

export async function demoLoginAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  redirect('/')
}

export async function signupAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  redirect('/')
}

// 회사 등록 신청 — 폼 직접 제출용(단일 인자). 접수 후 승인 대기 화면으로.
export async function registerCompanyAction(_formData: FormData): Promise<void> {
  redirect('/pending-approval')
}
