'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { makeAxhub, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

type LeaveRow = {
  id: string
  company_id: string
  employee_email: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: string
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

// 휴가 신청 — Server Action(요청 스코프, R3). 신청자 정보는 me() 에서.
export async function requestLeave(formData: FormData): Promise<void> {
  const leave_type = String(formData.get('leave_type') ?? '연차').trim()
  const start_date = String(formData.get('start_date') ?? '').trim()
  const end_date = String(formData.get('end_date') ?? start_date).trim()
  const reason = String(formData.get('reason') ?? '').trim()

  if (start_date) {
    const me = await (await makeAxhub()).identity.me()
    const t = await table<LeaveRow>('leave_requests')
    await t.insert({
      company_id: TENANT,
      employee_email: me.email ?? '',
      employee_name: me.name ?? me.email ?? '',
      leave_type,
      start_date,
      end_date: end_date || start_date,
      days: daysBetween(start_date, end_date || start_date),
      reason,
      status: '대기',
    })
    revalidatePath('/leave')
  }
  redirect('/leave')
}
