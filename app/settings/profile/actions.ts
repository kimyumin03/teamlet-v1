'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 내 프로필 수정 — 로그인 사용자(employee)의 이름·연락처 업데이트.
export async function updateProfile(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const name = String(formData.get('name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  if (!name) redirect('/settings/profile?error=name')
  try {
    await getDb()
      .update(employees)
      .set({ name, phone: phone || null, updatedAt: new Date() })
      .where(eq(employees.id, user.employeeId))
  } catch (err) {
    console.error('[db] updateProfile 실패', err)
  }
  revalidatePath('/settings/profile')
  revalidatePath('/members')
  redirect('/settings/profile')
}
