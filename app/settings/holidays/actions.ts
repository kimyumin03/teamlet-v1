'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { companyHolidays } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 공휴일 추가 — company_holidays insert (id/companyId/date/name, isNational=false).
export async function addHoliday(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const date = String(formData.get('date') || '')
  const name = String(formData.get('name') || '').trim()
  if (!date || !name) redirect('/settings/holidays?error=empty')
  try {
    await getDb().insert(companyHolidays).values({ id: crypto.randomUUID(), companyId: user.companyId, date, name, isNational: false })
  } catch (err) {
    console.error('[db] addHoliday 실패', err)
  }
  revalidatePath('/settings/holidays')
  revalidatePath('/leave/calendar')
  redirect('/settings/holidays')
}
