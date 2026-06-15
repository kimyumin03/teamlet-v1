'use server'

import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveRequests, leaveTypes } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 휴가 신청 — Server Action.
// ✅ 저장은 자체 DB(Neon)의 실제 leave_requests 테이블로. (axhub 는 건드리지 않아요)
// 신청자는 로그인 붙기 전까지 데모 직원으로 고정(lib/current-user.ts).

// 폼의 휴가종류(한국어) → leave_types.key 매핑
const TYPE_KEY: Record<string, string> = { 연차: 'annual', 병가: 'sick', 경조사: 'condolence' }

// 시작~종료일을 일수로 (양 끝 포함). 잘못된 입력은 1일로 방어.
function diffDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end || start)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  const d = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return d > 0 ? d : 1
}

export async function requestLeave(formData: FormData): Promise<void> {
  const user = getCurrentUser()
  const typeLabel = String(formData.get('leave_type') || '연차')
  const key = TYPE_KEY[typeLabel] ?? 'annual'
  const startDate = String(formData.get('start_date') || '')
  const endDate = String(formData.get('end_date') || '') || startDate
  const reason = String(formData.get('reason') || '')

  // 시작일 필수 — 비었으면 폼으로 되돌려요.
  if (!startDate) redirect('/leave/new?error=missing')

  let ok = true
  try {
    const db = getDb()
    // 휴가종류 id 해석 (회사 + key) — id 하드코딩 대신 조회로 안전하게.
    const lt = await db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, user.companyId), eq(leaveTypes.key, key)))
      .limit(1)
    if (!lt.length) throw new Error(`leave_type 없음: company=${user.companyId} key=${key}`)

    await db.insert(leaveRequests).values({
      id: crypto.randomUUID(), // id 는 text — 고유하면 형식 무관
      employeeId: user.employeeId,
      leaveTypeId: lt[0].id,
      startDate, // 'YYYY-MM-DD'
      endDate,
      days: String(diffDays(startDate, endDate)), // numeric → 문자열로
      reason,
      status: 'PENDING', // 신청 직후엔 대기
      updatedAt: new Date(),
      // unitType·schedule·createdAt 등은 DB 기본값
    })
  } catch (err) {
    console.error('[db] requestLeave insert 실패', err)
    ok = false
  }

  // redirect 는 try 밖에서 (NEXT_REDIRECT 를 catch 가 삼키지 않도록)
  redirect(ok ? '/leave?saved=1' : '/leave/new?error=db')
}
