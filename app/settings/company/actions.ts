'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 회사 정보 수정 — companies update.
export async function updateCompany(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const name = String(formData.get('name') || '').trim()
  const businessNumber = String(formData.get('businessNumber') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const addressRoad = String(formData.get('addressRoad') || '').trim()
  const addressDetail = String(formData.get('addressDetail') || '').trim()
  if (!name) redirect('/settings/company?error=name')
  try {
    await getDb()
      .update(companies)
      .set({
        name,
        businessNumber: businessNumber || null,
        phone: phone || null,
        addressRoad: addressRoad || null,
        addressDetail: addressDetail || null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, user.companyId))
  } catch (err) {
    console.error('[db] updateCompany 실패', err)
  }
  revalidatePath('/settings')
  revalidatePath('/settings/company')
  redirect('/settings')
}
