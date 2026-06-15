'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 부서 추가 — 자체 DB(Neon)의 실제 departments 에 insert (id/companyId/name/updatedAt, 나머지 기본값).
export async function addDepartment(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const name = String(formData.get('name') || '').trim()
  if (!name) redirect('/settings/org?error=name')
  try {
    await getDb().insert(departments).values({ id: crypto.randomUUID(), companyId: user.companyId, name, updatedAt: new Date() })
  } catch (err) {
    console.error('[db] addDepartment 실패', err)
  }
  revalidatePath('/settings/org')
  revalidatePath('/settings')
  redirect('/settings/org')
}

// 직책 추가 — positions 에 insert.
export async function addPosition(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const name = String(formData.get('name') || '').trim()
  if (!name) redirect('/settings/org?error=name')
  try {
    await getDb().insert(positions).values({ id: crypto.randomUUID(), companyId: user.companyId, name, updatedAt: new Date() })
  } catch (err) {
    console.error('[db] addPosition 실패', err)
  }
  revalidatePath('/settings/org')
  revalidatePath('/settings')
  redirect('/settings/org')
}
