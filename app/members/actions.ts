'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

export type ActionResult = { ok: true } | { ok: false; error: string }

// (useActionState 경로는 미사용 — 폼은 createEmployee 를 직접 써요)
export async function addEmployee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  void formData
  return { ok: false, error: '이 경로는 사용하지 않아요.' }
}

// 구성원 추가 — 자체 DB(Neon)의 실제 employees 에 insert.
// 필수: id·companyId·name·updatedAt. 나머지(employmentType/Status·dataSource·isActive·createdAt)는 DB 기본값.
// 부서/직책은 입력한 "이름"이 기존 부서/직책과 일치하면 자동 연결, 아니면 미배정.
export async function createEmployee(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const deptName = String(formData.get('department') || '').trim()
  const posName = String(formData.get('position') || '').trim()
  if (!name) redirect('/members/new?error=name')

  let ok = true
  try {
    const db = getDb()
    let departmentId: string | null = null
    let positionId: string | null = null
    if (deptName) {
      const d = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.companyId, user.companyId), eq(departments.name, deptName))).limit(1)
      departmentId = d[0]?.id ?? null
    }
    if (posName) {
      const p = await db.select({ id: positions.id }).from(positions).where(and(eq(positions.companyId, user.companyId), eq(positions.name, posName))).limit(1)
      positionId = p[0]?.id ?? null
    }
    await db.insert(employees).values({
      id: crypto.randomUUID(),
      companyId: user.companyId,
      name,
      companyEmail: email || null,
      departmentId,
      positionId,
      updatedAt: new Date(),
    })
  } catch (err) {
    console.error('[db] createEmployee 실패', err)
    ok = false
  }

  redirect(ok ? '/members?saved=1' : '/members/new?error=db')
}

// 구성원 수정 — 이름·이메일·부서·직책을 실제 employees 에 update.
async function resolveByName(table: typeof departments | typeof positions, companyId: string, name: string): Promise<string | null> {
  if (!name) return null
  const r = await getDb().select({ id: table.id }).from(table).where(and(eq(table.companyId, companyId), eq(table.name, name))).limit(1)
  return r[0]?.id ?? null
}

export async function updateEmployee(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const id = String(formData.get('id') || '')
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const deptName = String(formData.get('department') || '').trim()
  const posName = String(formData.get('position') || '').trim()
  if (!id || !name) redirect(`/members/${id}/edit?error=name`)

  let ok = true
  try {
    const departmentId = await resolveByName(departments, user.companyId, deptName)
    const positionId = await resolveByName(positions, user.companyId, posName)
    await getDb()
      .update(employees)
      .set({ name, companyEmail: email || null, departmentId, positionId, updatedAt: new Date() })
      .where(eq(employees.id, id))
  } catch (err) {
    console.error('[db] updateEmployee 실패', err)
    ok = false
  }

  revalidatePath(`/members/${id}`)
  revalidatePath('/members')
  redirect(ok ? `/members/${id}` : `/members/${id}/edit?error=db`)
}
