'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { jobPostings } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 채용 공고 만들기 — job_postings insert (status 기본 DRAFT).
export async function createPosting(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()
  if (!title) redirect('/recruit/new?error=title')

  let ok = true
  const newId = crypto.randomUUID()
  try {
    await getDb().insert(jobPostings).values({
      id: newId,
      companyId: user.companyId,
      managerId: user.employeeId,
      title,
      description: description || null,
      updatedAt: new Date(),
    })
  } catch (err) {
    console.error('[db] createPosting 실패', err)
    ok = false
  }

  revalidatePath('/recruit')
  redirect(ok ? `/recruit/postings/${newId}` : '/recruit/new?error=db')
}
