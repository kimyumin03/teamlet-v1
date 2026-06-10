'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AxHubError } from '@ax-hub/sdk'
import { TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

type Employee = {
  id: string
  company_id: string
  name: string
  email: string
  department: string
  position: string
  status: string
}

export type ActionResult = { ok: true } | { ok: false; error: string }

// 구성원 추가 — Server Action (요청 스코프 → 로그인 세션으로 인증, R3).
// employees 는 회사공유 테이블(owner 없음)이라 company_id 를 직접 지정 (owner_id 아님).
export async function addEmployee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const department = String(formData.get('department') ?? '').trim()
  const position = String(formData.get('position') ?? '').trim()
  const status = String(formData.get('status') ?? '재직').trim()

  if (!name) return { ok: false, error: '이름을 입력해 주세요.' }
  if (!email) return { ok: false, error: '이메일을 입력해 주세요.' }

  try {
    const employees = await table<Employee>('employees')
    await employees.insert({ company_id: TENANT, name, email, department, position, status })
    revalidatePath('/members')
    return { ok: true }
  } catch (err) {
    if (err instanceof AxHubError) {
      console.error('[axhub] addEmployee failed', { code: err.code, category: err.category, requestId: err.requestId })
      return { ok: false, error: '저장에 실패했어요. 로그인 상태를 확인해 주세요.' }
    }
    throw err
  }
}

// 폼 직접 제출용 (server component <form action>) — 저장 후 /members 로 이동.
export async function createEmployee(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const department = String(formData.get('department') ?? '').trim()
  const position = String(formData.get('position') ?? '').trim()
  const status = String(formData.get('status') ?? '재직').trim()

  if (name && email) {
    const employees = await table<Employee>('employees')
    await employees.insert({ company_id: TENANT, name, email, department, position, status })
    revalidatePath('/members')
  }
  redirect('/members')
}
