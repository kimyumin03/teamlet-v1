'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { recognitions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 인정 보내기 — 자체 DB(Neon)의 실제 recognitions 에 insert. 홈 인정탭에 떠요.
// 필수: id·companyId·senderId·recipientId·message (kind 는 기본 'RECOGNITION').
export async function sendRecognition(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const recipientId = String(formData.get('recipientId') || '')
  const message = String(formData.get('message') || '').trim()
  if (!recipientId || !message) redirect('/recognitions/new?error=empty')

  let ok = true
  try {
    await getDb().insert(recognitions).values({
      id: crypto.randomUUID(),
      companyId: user.companyId,
      senderId: user.employeeId,
      recipientId,
      message,
    })
  } catch (err) {
    console.error('[db] sendRecognition 실패', err)
    ok = false
  }

  revalidatePath('/')
  redirect(ok ? '/?tab=recognition' : '/recognitions/new?error=db')
}
