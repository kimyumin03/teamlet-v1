'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { announcements } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 공지 작성 — 자체 DB(Neon)의 실제 announcements 에 insert. 홈 피드에 바로 떠요.
export async function postAnnouncement(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const title = String(formData.get('title') || '').trim()
  const content = String(formData.get('content') || '').trim()
  if (!title || !content) redirect('/announcements/new?error=empty')

  let ok = true
  try {
    await getDb().insert(announcements).values({
      id: crypto.randomUUID(),
      companyId: user.companyId,
      authorId: user.employeeId,
      title,
      content,
      updatedAt: new Date(),
    })
  } catch (err) {
    console.error('[db] postAnnouncement 실패', err)
    ok = false
  }

  revalidatePath('/')
  redirect(ok ? '/?tab=news' : '/announcements/new?error=db')
}
