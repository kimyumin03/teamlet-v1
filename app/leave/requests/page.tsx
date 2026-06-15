import Link from 'next/link'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveRequests, leaveTypes, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { decideLeave } from '../actions'

// 휴가 승인 — 회사 전체 대기(PENDING) 신청 목록. 승인/반려는 Neon 에 실제 반영돼요.
export const dynamic = 'force-dynamic'

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function LeaveRequestsPage() {
  const user = getCurrentUser()
  let requests: {
    id: string
    employeeName: string
    leaveTypeName: string | null
    startDate: string
    endDate: string
    days: string
    reason: string
  }[] = []
  try {
    const db = getDb()
    requests = await db
      .select({
        id: leaveRequests.id,
        employeeName: employees.name,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(and(eq(employees.companyId, user.companyId), eq(leaveRequests.status, 'PENDING')))
      .orderBy(desc(leaveRequests.createdAt))
  } catch (err) {
    console.error('[db] leave requests load 실패', err)
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="shrink-0 px-8 pt-7 pb-3">
        <Link href="/leave" className="mb-3 inline-flex items-center gap-1 text-[12px] text-foreground-subtle hover:text-foreground transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
            <path fillRule="evenodd" d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
          </svg>
          내 휴가
        </Link>
        <div className="page-h" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h-title">휴가 승인</h1>
            <p className="h-sub mt-1.5">대기 중인 신청 {requests.length}건</p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto px-8 pb-10">
        <div className="mx-auto max-w-2xl flex flex-col gap-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <p className="text-[14px] font-medium text-foreground">대기 중인 신청이 없어요</p>
              <p className="text-[12.5px] text-foreground-muted">모든 휴가 신청이 처리됐어요.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-background-primary px-5 py-4">
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground">{r.employeeName}</span>
                    <span className="rounded-[5px] border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground-muted">
                      {r.leaveTypeName ?? '휴가'}
                    </span>
                  </div>
                  <span className="text-[12px] text-foreground-muted">
                    {formatDate(r.startDate)} ~ {formatDate(r.endDate)} · {Number(r.days)}일
                    {r.reason && <span className="ml-2 text-foreground-subtle">· {r.reason}</span>}
                  </span>
                </div>
                <div className="shrink-0">
                  <form action={decideLeave} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="APPROVED" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>승인</button>
                    <button name="decision" value="REJECTED" className="btn btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>반려</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
